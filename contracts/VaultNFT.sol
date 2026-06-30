// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./VaultCore.sol";

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

/**
 * @title VaultNFT
 * @notice NFT-collateralized USDC lending escrow. Borrowers list NFTs,
 *         lenders submit offers, and upon acceptance the loan becomes
 *         active with simple interest. Supports full/partial repayment,
 *         default claiming, and admin-mediated dispute resolution.
 */
contract VaultNFT is VaultCore, IERC721Receiver {
    /// @notice Lifecycle of an NFT-backed loan listing.
    enum Stage { LISTED, FUNDED, ACTIVE, REPAID, DEFAULTED, CANCELLED, DISPUTED }

    /// @notice Core loan listing data stored on-chain.
    struct Listing {
        address borrower;        ///< Who listed the NFT and receives the loan.
        address nftContract;     ///< ERC-721 contract address.
        uint256 nftTokenId;      ///< Token ID held as collateral.
        uint256 principal;       ///< Desired loan amount (USDC units, 6 decimals).
        uint256 apr;             ///< Annual percentage rate in basis points (1 bp = 0.01%).
        uint256 term;            ///< Loan duration in days.
        address acceptedLender;  ///< Lender whose offer was accepted.
        uint256 acceptedAmount;  ///< Final loan amount funded.
        uint256 acceptedApr;     ///< Agreed APR (must match lender's offer).
        uint256 acceptedTerm;    ///< Agreed term in days.
        uint256 fundedAt;        ///< Block timestamp when loan became active.
        uint256 repaidSoFar;     ///< Running total of repayments (for partial repay).
        Stage stage;             ///< Current lifecycle stage.
    }

    /// @notice Lender offer terms stored per listing.
    struct Offer { uint256 apr; uint256 term; }

    /// @notice EIP-712 signed loan offer terms.
    struct SignedLoanOffer {
        uint256 listingId;
        address lender;
        uint256 amount;
        uint256 apr;
        uint256 term;
        uint256 expiry;
        uint256 nonce;
    }

    bytes32 public constant SIGNED_LOAN_OFFER_TYPEHASH = keccak256(
        "SignedLoanOffer(uint256 listingId,address lender,uint256 amount,uint256 apr,uint256 term,uint256 expiry,uint256 nonce)"
    );

    /// @notice Total listings created (increments monotonically, 1-indexed).
    uint256 public listingCount;
    /// @notice Full listing data keyed by listing ID.
    mapping(uint256 => Listing) public listings;
    /// @notice USDC deposited by each lender for each listing.
    mapping(uint256 => mapping(address => uint256)) public lenderDeposits;
    /// @notice Total USDC held in escrow per listing (sum of all lender deposits).
    mapping(uint256 => uint256) public listingEscrowBalance;
    /// @notice Ordered list of lender addresses that have submitted offers.
    mapping(uint256 => address[]) private _offerLenders;
    /// @notice Whether a lender already has an active offer for a listing.
    mapping(uint256 => mapping(address => bool)) private _hasOffer;
    /// @notice Offer terms (APR, term) stored per listing per lender.
    mapping(uint256 => mapping(address => Offer)) public offers;

    /// @notice Extra 24-hour window after term expiry before lender can claim.
    uint256 public constant GRACE_PERIOD = 24 hours;

    // ── Events ──────────────────────────────────────────────────

    /// @notice Emitted when a borrower lists an NFT as collateral.
    event Listed(uint256 indexed listingId, address borrower, address nftContract, uint256 tokenId, uint256 amount, uint256 apr, uint256 term);
    /// @notice Emitted when a borrower cancels a listing before any offer is accepted.
    event Cancelled(uint256 indexed listingId);
    /// @notice Emitted when a lender submits (or updates) an offer.
    event OfferSubmitted(uint256 indexed listingId, address lender, uint256 amount, uint256 apr, uint256 term);
    /// @notice Emitted when a lender withdraws their offer.
    event OfferWithdrawn(uint256 indexed listingId, address lender, uint256 amount);
    /// @notice Emitted when a borrower accepts a lender's offer.
    event OfferAccepted(uint256 indexed listingId, address lender, uint256 amount);
    /// @notice Emitted when a borrower accepts a lender's EIP-712 signed offer.
    event SignedOfferAccepted(uint256 indexed listingId, address indexed lender, uint256 amount, uint256 nonce);
    /// @notice Emitted on any repayment (full or partial).
    event Repaid(uint256 indexed listingId, uint256 amount);
    /// @notice Emitted when a lender claims the NFT collateral after default.
    event DefaultClaimed(uint256 indexed listingId, address lender, address nftContract, uint256 tokenId);
    /// @notice Emitted when either party initiates a dispute.
    event Disputed(uint256 indexed listingId);
    /// @notice Emitted when an admin resolves a dispute.
    event Resolved(uint256 indexed listingId, Stage outcome, bool nftToLender);
    /// @notice Emitted when a borrower updates the listing terms.
    event ListingUpdated(uint256 indexed listingId, uint256 amount, uint256 apr, uint256 term);

    // ── Errors ──────────────────────────────────────────────────

    /// @notice Caller is not the borrower of this listing.
    error NotBorrower();
    /// @notice Caller is not the accepted lender (used in claimCollateral).
    error NotLender();
    /// @notice Caller is neither the borrower nor the accepted lender (used in dispute).
    error NotParty();
    /// @notice Caller does not own the NFT being listed.
    error NotNFTOwner();
    /// @notice Accepted APR/term does not match the lender's offer.
    error OfferMismatch();
    /// @notice The listing is not in the stage required for this operation.
    error InvalidStage(Stage current, Stage expected);
    /// @notice The grace period has not yet elapsed for a default claim.
    error GracePeriodNotPassed();

    /// @param _usdc            USDC token address.
    /// @param _platformFeeBps  Initial platform fee in bp (max 500).
    constructor(address _usdc, uint256 _platformFeeBps) VaultCore(_usdc, _platformFeeBps) {}

    /// @notice Restricts execution to the borrower of the given listing.
    modifier onlyBorrower(uint256 listingId) {
        if (msg.sender != listings[listingId].borrower) revert NotBorrower();
        _;
    }

    /// @notice Reverts unless the listing is in the expected stage.
    modifier atStage(uint256 listingId, Stage expected) {
        if (listings[listingId].stage != expected) revert InvalidStage(listings[listingId].stage, expected);
        _;
    }

    // ────────────────────────────────────────────────────────────
    //  BORROWER
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Lists an NFT as collateral for a desired loan.
     * @param nftContract ERC-721 contract address.
     * @param tokenId     Token ID to deposit as collateral.
     * @param amount      Desired loan principal (USDC, 6 decimals).
     * @param apr         Desired APR in basis points.
     * @param term        Loan duration in days.
     * @return listingId  The newly created listing ID (1-indexed).
     * @dev Transfers the NFT from caller to this contract.
     */
    function listNFT(address nftContract, uint256 tokenId, uint256 amount, uint256 apr, uint256 term)
        external nonReentrant returns (uint256)
    {
        require(amount > 0, "Amount must be > 0");
        require(term > 0, "Term must be > 0");
        IERC721 nft = IERC721(nftContract);
        if (nft.ownerOf(tokenId) != msg.sender) revert NotNFTOwner();
        listingCount++;
        listings[listingCount] = Listing({
            borrower: msg.sender, nftContract: nftContract, nftTokenId: tokenId,
            principal: amount, apr: apr, term: term,
            acceptedLender: address(0), acceptedAmount: 0, acceptedApr: 0, acceptedTerm: 0,
            fundedAt: 0, repaidSoFar: 0, stage: Stage.LISTED
        });
        nft.safeTransferFrom(msg.sender, address(this), tokenId);
        emit Listed(listingCount, msg.sender, nftContract, tokenId, amount, apr, term);
        return listingCount;
    }

    /**
     * @notice Cancels a listing before any offer is accepted.
     *         Refunds all lender offers and returns the NFT to the borrower.
     * @param listingId The listing to cancel.
     */
    function cancelListing(uint256 listingId) external onlyBorrower(listingId) atStage(listingId, Stage.LISTED) {
        _refundNftOffers(listingId, address(0));
        Listing storage l = listings[listingId];
        l.stage = Stage.CANCELLED;
        IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);
        emit Cancelled(listingId);
    }

    /**
     * @notice Updates the terms of a live listing (principal, APR, term).
     * @param listingId The listing to update.
     * @param newAmount New principal amount.
     * @param newApr    New APR in basis points.
     * @param newTerm   New term in days.
     * @dev Existing offers are NOT cleared; lenders may need to update
     *      their offers to match the new terms.
     */
    function updateListing(uint256 listingId, uint256 newAmount, uint256 newApr, uint256 newTerm)
        external onlyBorrower(listingId) atStage(listingId, Stage.LISTED)
    {
        require(newAmount > 0 && newTerm > 0, "Invalid params");
        Listing storage l = listings[listingId];
        l.principal = newAmount; l.apr = newApr; l.term = newTerm;
        emit ListingUpdated(listingId, newAmount, newApr, newTerm);
    }

    // ────────────────────────────────────────────────────────────
    //  LENDER
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Submits a lending offer with USDC deposit.
     * @param listingId The listing to offer on.
     * @param amount    USDC amount to deposit.
     * @param apr       Offered APR in basis points.
     * @param term      Offered term in days.
     * @dev Each lender can only have one active offer per listing.
     */
    function submitOffer(uint256 listingId, uint256 amount, uint256 apr, uint256 term)
        external nonReentrant whenNotPaused atStage(listingId, Stage.LISTED)
    {
        require(amount > 0, "Amount must be > 0");
        if (_hasOffer[listingId][msg.sender]) revert AlreadyOffered();
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        lenderDeposits[listingId][msg.sender] = amount;
        listingEscrowBalance[listingId] += amount;
        _offerLenders[listingId].push(msg.sender);
        _hasOffer[listingId][msg.sender] = true;
        offers[listingId][msg.sender] = Offer({apr: apr, term: term});
        emit OfferSubmitted(listingId, msg.sender, amount, apr, term);
    }

    /**
     * @notice Updates an existing offer's amount and/or terms.
     * @param listingId The listing.
     * @param newAmount New deposit amount. If larger, caller deposits more.
     *                  If smaller, the difference is refunded in the same tx.
     * @param newApr    New APR in basis points.
     * @param newTerm   New term in days.
     * @dev State is written before the external transfer when reducing
     *      the deposit, following checks-effects-interactions.
     */
    function updateOffer(uint256 listingId, uint256 newAmount, uint256 newApr, uint256 newTerm)
        external whenNotPaused atStage(listingId, Stage.LISTED)
    {
        require(_hasOffer[listingId][msg.sender], "No offer to update");
        require(newAmount > 0, "Amount must be > 0");
        uint256 current = lenderDeposits[listingId][msg.sender];
        if (newAmount > current) {
            if (!usdc.transferFrom(msg.sender, address(this), newAmount - current)) revert TransferFailed();
            listingEscrowBalance[listingId] += newAmount - current;
        } else if (newAmount < current) {
            listingEscrowBalance[listingId] -= current - newAmount;
            lenderDeposits[listingId][msg.sender] = newAmount;
            offers[listingId][msg.sender] = Offer({apr: newApr, term: newTerm});
            if (!usdc.transfer(msg.sender, current - newAmount)) revert TransferFailed();
            emit OfferSubmitted(listingId, msg.sender, newAmount, newApr, newTerm);
            return;
        }
        lenderDeposits[listingId][msg.sender] = newAmount;
        offers[listingId][msg.sender] = Offer({apr: newApr, term: newTerm});
        emit OfferSubmitted(listingId, msg.sender, newAmount, newApr, newTerm);
    }

    /**
     * @notice Withdraws a previously submitted offer and returns the USDC deposit.
     * @param listingId The listing to withdraw from.
     * @dev Cannot withdraw an offer that has already been accepted.
     */
    function withdrawOffer(uint256 listingId) external nonReentrant {
        uint256 deposited = lenderDeposits[listingId][msg.sender];
        require(deposited > 0, "No deposit for this listing");
        Listing storage l = listings[listingId];
        require(l.stage == Stage.LISTED || msg.sender != l.acceptedLender, "Accepted offer cannot be withdrawn");
        lenderDeposits[listingId][msg.sender] = 0;
        listingEscrowBalance[listingId] -= deposited;
        _hasOffer[listingId][msg.sender] = false;
        delete offers[listingId][msg.sender];
        if (!usdc.transfer(msg.sender, deposited)) revert TransferFailed();
        emit OfferWithdrawn(listingId, msg.sender, deposited);
    }

    // ────────────────────────────────────────────────────────────
    //  BORROWER — accept
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Accepts a specific lender's offer, activating the loan.
     * @param listingId      The listing.
     * @param lender         Address of the lender whose offer to accept.
     * @param acceptedAmount Amount to accept (may be <= deposited amount).
     * @param acceptedApr    APR to accept (must match lender's offer).
     * @param acceptedTerm   Term to accept (must match lender's offer).
     * @dev Any excess deposit is refunded to the lender. All other offers
     *      are automatically refunded. Platform fee is deducted from the
     *      amount sent to the borrower.
     */
    function acceptOffer(uint256 listingId, address lender, uint256 acceptedAmount, uint256 acceptedApr, uint256 acceptedTerm)
        external nonReentrant whenNotPaused onlyBorrower(listingId) atStage(listingId, Stage.LISTED)
    {
        uint256 deposited = lenderDeposits[listingId][lender];
        require(deposited >= acceptedAmount, "Lender has insufficient deposit");
        require(acceptedAmount > 0, "Amount must be > 0");
        require(deposited > 0, "No deposit from this lender");
        Offer memory offer = offers[listingId][lender];
        if (offer.apr != acceptedApr || offer.term != acceptedTerm) revert OfferMismatch();
        Listing storage l = listings[listingId];
        if (deposited > acceptedAmount) {
            listingEscrowBalance[listingId] -= deposited - acceptedAmount;
            if (!usdc.transfer(lender, deposited - acceptedAmount)) revert TransferFailed();
        }
        lenderDeposits[listingId][lender] = 0;
        _hasOffer[listingId][lender] = false;
        l.acceptedLender = lender; l.acceptedAmount = acceptedAmount;
        l.acceptedApr = acceptedApr; l.acceptedTerm = acceptedTerm;
        l.fundedAt = block.timestamp; l.stage = Stage.ACTIVE;
        uint256 fee = (acceptedAmount * platformFeeBps) / 10000;
        listingEscrowBalance[listingId] -= acceptedAmount;
        if (!usdc.transfer(msg.sender, acceptedAmount - fee)) revert TransferFailed();
        if (fee > 0 && !usdc.transfer(treasury, fee)) revert TransferFailed();
        _refundNftOffers(listingId, lender);
        emit OfferAccepted(listingId, lender, acceptedAmount);
    }

    /**
     * @notice Accepts a lender's EIP-712 signed offer, pulling USDC at acceptance time.
     * @param offer     Signed loan offer terms.
     * @param signature Lender signature over the offer.
     */
    function acceptSignedOffer(SignedLoanOffer calldata offer, bytes calldata signature)
        external nonReentrant whenNotPaused onlyBorrower(offer.listingId) atStage(offer.listingId, Stage.LISTED)
    {
        require(offer.amount > 0 && offer.term > 0, "Invalid offer");
        bytes32 structHash = keccak256(
            abi.encode(
                SIGNED_LOAN_OFFER_TYPEHASH,
                offer.listingId,
                offer.lender,
                offer.amount,
                offer.apr,
                offer.term,
                offer.expiry,
                offer.nonce
            )
        );
        address signer = _recoverSigner(_hashTypedData("VaultNFT", structHash), signature);
        if (signer != offer.lender) revert InvalidSignature();
        _consumeOfferNonce(offer.lender, offer.nonce, offer.expiry);

        Listing storage l = listings[offer.listingId];
        l.acceptedLender = offer.lender;
        l.acceptedAmount = offer.amount;
        l.acceptedApr = offer.apr;
        l.acceptedTerm = offer.term;
        l.fundedAt = block.timestamp;
        l.stage = Stage.ACTIVE;

        if (!usdc.transferFrom(offer.lender, address(this), offer.amount)) revert TransferFailed();
        uint256 fee = (offer.amount * platformFeeBps) / 10000;
        if (!usdc.transfer(msg.sender, offer.amount - fee)) revert TransferFailed();
        if (fee > 0 && !usdc.transfer(treasury, fee)) revert TransferFailed();
        _refundNftOffers(offer.listingId, offer.lender);
        emit OfferAccepted(offer.listingId, offer.lender, offer.amount);
        emit SignedOfferAccepted(offer.listingId, offer.lender, offer.amount, offer.nonce);
    }

    // ────────────────────────────────────────────────────────────
    //  BORROWER — repay
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Fully repays the outstanding loan balance (principal + interest).
     * @param listingId The listing to repay.
     * @param amount    USDC amount sent. Must cover the full remaining balance;
     *                  any excess is refunded to the borrower.
     * @dev Returns the NFT collateral to the borrower upon full repayment.
     */
    function repay(uint256 listingId, uint256 amount)
        external nonReentrant onlyBorrower(listingId) atStage(listingId, Stage.ACTIVE)
    {
        Listing storage l = listings[listingId];
        uint256 interest = (l.acceptedAmount * l.acceptedApr * l.acceptedTerm) / 3650000;
        uint256 totalDue = l.acceptedAmount + interest;
        uint256 remaining = totalDue - l.repaidSoFar;
        require(amount >= remaining, "Insufficient repayment");
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        l.stage = Stage.REPAID;
        if (!usdc.transfer(l.acceptedLender, remaining)) revert TransferFailed();
        if (amount > remaining && !usdc.transfer(msg.sender, amount - remaining)) revert TransferFailed();
        IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);
        emit Repaid(listingId, totalDue);
    }

    /**
     * @notice Makes a partial repayment towards the outstanding balance.
     * @param listingId     The listing to repay.
     * @param partialAmount USDC amount to repay. Must not exceed the
     *                       remaining balance (use repay() to close).
     * @dev Automatically closes the loan and returns the NFT if the
     *      cumulative repayments reach the total due.
     */
    function repayPartial(uint256 listingId, uint256 partialAmount)
        external nonReentrant onlyBorrower(listingId) atStage(listingId, Stage.ACTIVE)
    {
        require(partialAmount > 0, "Amount must be > 0");
        Listing storage l = listings[listingId];
        uint256 interest = (l.acceptedAmount * l.acceptedApr * l.acceptedTerm) / 3650000;
        uint256 totalDue = l.acceptedAmount + interest;
        uint256 remaining = totalDue - l.repaidSoFar;
        require(partialAmount <= remaining, "Overpayment - use repay() to close");
        if (!usdc.transferFrom(msg.sender, address(this), partialAmount)) revert TransferFailed();
        l.repaidSoFar += partialAmount;
        if (!usdc.transfer(l.acceptedLender, partialAmount)) revert TransferFailed();
        if (l.repaidSoFar >= totalDue) {
            l.stage = Stage.REPAID;
            IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);
        }
        emit Repaid(listingId, partialAmount);
    }

    // ────────────────────────────────────────────────────────────
    //  LENDER — claim / dispute
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Claims the NFT collateral after the loan term + grace period expires.
     * @param listingId The listing to claim from.
     * @dev Only the accepted lender can call. Requires `term` days + GRACE_PERIOD
     *      to have passed since funding.
     */
    function claimCollateral(uint256 listingId) external nonReentrant atStage(listingId, Stage.ACTIVE) {
        Listing storage l = listings[listingId];
        if (msg.sender != l.acceptedLender) revert NotLender();
        if (block.timestamp < l.fundedAt + (l.acceptedTerm * 1 days) + GRACE_PERIOD) revert GracePeriodNotPassed();
        l.stage = Stage.DEFAULTED;
        IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);
        emit DefaultClaimed(listingId, msg.sender, l.nftContract, l.nftTokenId);
    }

    /**
     * @notice Initiates a dispute on an active loan. Either party may call.
     * @param listingId The listing to dispute.
     * @dev Moves the listing to DISPUTED stage; only an admin can resolve from there.
     */
    function dispute(uint256 listingId) external atStage(listingId, Stage.ACTIVE) {
        Listing storage l = listings[listingId];
        if (msg.sender != l.borrower && msg.sender != l.acceptedLender) revert NotParty();
        l.stage = Stage.DISPUTED;
        emit Disputed(listingId);
    }

    /**
     * @notice Admin resolves a disputed loan by deciding who gets the NFT.
     * @param listingId    The disputed listing.
     * @param nftToLender  If true, NFT goes to lender; if false, to borrower.
     */
    function resolve(uint256 listingId, bool nftToLender)
        external onlyAdmin nonReentrant atStage(listingId, Stage.DISPUTED)
    {
        Listing storage l = listings[listingId];
        l.stage = Stage.REPAID;
        IERC721(l.nftContract).safeTransferFrom(address(this), nftToLender ? l.acceptedLender : l.borrower, l.nftTokenId);
        emit Resolved(listingId, Stage.REPAID, nftToLender);
    }

    // ────────────────────────────────────────────────────────────
    //  HELPERS
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Refunds all lender offers for a listing.
     * @param listingId The listing.
     * @param skip      Address to skip (the accepted lender during acceptOffer).
     * @dev Always clears the lenders array after processing.
     */
    function _refundNftOffers(uint256 listingId, address skip) private {
        address[] storage lenders = _offerLenders[listingId];
        for (uint256 i = 0; i < lenders.length; i++) {
            address lender = lenders[i];
            if (lender == skip) continue;
            uint256 d = lenderDeposits[listingId][lender];
            if (d > 0) {
                listingEscrowBalance[listingId] -= d;
                lenderDeposits[listingId][lender] = 0;
                _hasOffer[listingId][lender] = false;
                delete offers[listingId][lender];
                if (!usdc.transfer(lender, d)) revert TransferFailed();
                emit OfferWithdrawn(listingId, lender, d);
            }
        }
        delete _offerLenders[listingId];
    }

    /// @notice Returns the number of active offers for a listing.
    function getOfferCount(uint256 listingId) external view returns (uint256) { return _offerLenders[listingId].length; }
    /// @notice Returns all lender addresses with active offers for a listing.
    function getOfferLenders(uint256 listingId) external view returns (address[] memory) { return _offerLenders[listingId]; }
    /// @notice Returns repayment details: totalDue, paid, remaining.
    function getRepaymentDue(uint256 listingId) external view returns (uint256 totalDue, uint256 paid, uint256 remaining) {
        Listing storage l = listings[listingId];
        uint256 interest = (l.acceptedAmount * l.acceptedApr * l.acceptedTerm) / 3650000;
        totalDue = l.acceptedAmount + interest; paid = l.repaidSoFar; remaining = totalDue - paid;
    }
    /// @notice Returns the Unix timestamp when the loan term expires.
    function getDeadline(uint256 listingId) external view returns (uint256) {
        Listing storage l = listings[listingId];
        return l.fundedAt + (l.acceptedTerm * 1 days);
    }

    /// @notice ERC-721 receiver callback. Always accepts NFTs.
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
