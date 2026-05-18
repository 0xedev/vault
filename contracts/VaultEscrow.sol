// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VaultEscrow
 * @notice NFT-collateralised loan escrow.
 *         1. Borrower lists NFT → NFT enters escrow.
 *         2. Lenders submit ETH offers.
 *         3. Borrower accepts one offer → ETH released to borrower, loan starts.
 *         4. Borrower repays → NFT returned. Default → lender claims NFT.
 *         Admin resolves disputes.
 */
interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

contract VaultEscrow {
    address public admin;
    uint256 public platformFeeBps; // basis points (150 = 1.5%)

    enum Stage { LISTED, FUNDED, ACTIVE, REPAID, DEFAULTED, CANCELLED, DISPUTED }

    struct Listing {
        address borrower;
        address nftContract;
        uint256 nftTokenId;
        uint256 principal;        // requested borrow amount in wei
        uint256 apr;              // annual percentage rate (e.g. 1420 = 14.2%)
        uint256 term;             // loan term in days
        address acceptedLender;
        uint256 acceptedAmount;
        uint256 acceptedApr;
        uint256 acceptedTerm;
        uint256 fundedAt;         // block.timestamp when offer was accepted
        Stage stage;
    }

    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;

    // Track ETH deposits per listing per lender
    mapping(uint256 => mapping(address => uint256)) public lenderDeposits;
    // List of lenders who have active offers on a listing
    mapping(uint256 => address[]) private _offerLenders;
    // Quick lookup: is lender in _offerLenders for a listing?
    mapping(uint256 => mapping(address => bool)) private _hasOffer;

    // ── Events ────────────────────────────────────────────────
    event Listed(uint256 indexed listingId, address borrower, address nftContract, uint256 tokenId, uint256 amount, uint256 apr, uint256 term);
    event Cancelled(uint256 indexed listingId);
    event OfferSubmitted(uint256 indexed listingId, address lender, uint256 amount, uint256 apr, uint256 term);
    event OfferWithdrawn(uint256 indexed listingId, address lender, uint256 amount);
    event OfferAccepted(uint256 indexed listingId, address lender, uint256 amount);
    event Repaid(uint256 indexed listingId, uint256 amount);
    event DefaultClaimed(uint256 indexed listingId, address lender, address nftContract, uint256 tokenId);
    event Disputed(uint256 indexed listingId);
    event Resolved(uint256 indexed listingId, Stage outcome, uint256 borrowerAmount, uint256 lenderAmount);
    event PlatformFeeUpdated(uint256 newFee);

    // ── Errors ────────────────────────────────────────────────
    error NotAdmin();
    error NotBorrower();
    error NotLender();
    error InvalidStage(Stage current, Stage expected);
    error DeadlineNotPassed();
    error DeadlinePassed();
    error NotNFTOwner();
    error OfferExpired();
    error NoActiveOffer();
    error TransferFailed();
    error AlreadyOffered();

    // ── Modifiers ─────────────────────────────────────────────
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyBorrower(uint256 listingId) {
        if (msg.sender != listings[listingId].borrower) revert NotBorrower();
        _;
    }

    modifier atStage(uint256 listingId, Stage expected) {
        if (listings[listingId].stage != expected) revert InvalidStage(listings[listingId].stage, expected);
        _;
    }

    // ── Constructor ───────────────────────────────────────────
    constructor(uint256 _platformFeeBps) {
        admin = msg.sender;
        platformFeeBps = _platformFeeBps;
    }

    // ═══════════════════════════════════════════════════════════
    //  BORROWER — list NFT as collateral
    // ═══════════════════════════════════════════════════════════

    /// @notice Borrower deposits NFT into escrow to create a loan listing.
    /// @dev Caller must have approved this contract to transfer the NFT.
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 apr,
        uint256 term
    ) external returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        require(term > 0, "Term must be > 0");

        IERC721 nft = IERC721(nftContract);
        if (nft.ownerOf(tokenId) != msg.sender) revert NotNFTOwner();

        listingCount++;
        listings[listingCount] = Listing({
            borrower: msg.sender,
            nftContract: nftContract,
            nftTokenId: tokenId,
            principal: amount,
            apr: apr,
            term: term,
            acceptedLender: address(0),
            acceptedAmount: 0,
            acceptedApr: 0,
            acceptedTerm: 0,
            fundedAt: 0,
            stage: Stage.LISTED
        });

        // Pull NFT into escrow
        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        emit Listed(listingCount, msg.sender, nftContract, tokenId, amount, apr, term);
        return listingCount;
    }

    /// @notice Borrower cancels listing if no offer has been accepted yet.
    function cancelListing(uint256 listingId)
        external
        onlyBorrower(listingId)
        atStage(listingId, Stage.LISTED)
    {
        Listing storage l = listings[listingId];
        l.stage = Stage.CANCELLED;

        // Return NFT to borrower
        IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);

        emit Cancelled(listingId);
    }

    /// @notice Borrower updates loan terms while listing is still open.
    function updateListing(
        uint256 listingId,
        uint256 newAmount,
        uint256 newApr,
        uint256 newTerm
    )
        external
        onlyBorrower(listingId)
        atStage(listingId, Stage.LISTED)
    {
        Listing storage l = listings[listingId];
        require(newAmount > 0, "Amount must be > 0");
        require(newTerm > 0, "Term must be > 0");
        l.principal = newAmount;
        l.apr = newApr;
        l.term = newTerm;
    }

    // ═══════════════════════════════════════════════════════════
    //  LENDER — submit / withdraw offer
    // ═══════════════════════════════════════════════════════════

    /// @notice Lender deposits ETH to submit an offer on a listing.
    /// @param apr  APR in basis points (e.g. 1420 = 14.2%)
    /// @param term Loan term in days
    function submitOffer(
        uint256 listingId,
        uint256 amount,
        uint256 apr,
        uint256 term
    )
        external
        payable
        atStage(listingId, Stage.LISTED)
    {
        require(msg.value == amount, "ETH sent must equal offer amount");
        require(amount > 0, "Amount must be > 0");
        if (_hasOffer[listingId][msg.sender]) revert AlreadyOffered();

        lenderDeposits[listingId][msg.sender] = msg.value;
        _offerLenders[listingId].push(msg.sender);
        _hasOffer[listingId][msg.sender] = true;

        emit OfferSubmitted(listingId, msg.sender, amount, apr, term);
    }

    /// @notice Lender withdraws their ETH if their offer was not accepted.
    function withdrawOffer(uint256 listingId) external {
        uint256 deposited = lenderDeposits[listingId][msg.sender];
        require(deposited > 0, "No deposit for this listing");

        Listing storage l = listings[listingId];
        require(
            l.stage == Stage.LISTED || msg.sender != l.acceptedLender,
            "Accepted offer cannot be withdrawn"
        );

        lenderDeposits[listingId][msg.sender] = 0;
        _hasOffer[listingId][msg.sender] = false;

        (bool sent,) = msg.sender.call{value: deposited}("");
        if (!sent) revert TransferFailed();

        emit OfferWithdrawn(listingId, msg.sender, deposited);
    }

    // ═══════════════════════════════════════════════════════════
    //  BORROWER — accept offer
    // ═══════════════════════════════════════════════════════════

    /// @notice Borrower accepts a lender's offer. ETH is released to borrower.
    /// @param lender The lender whose offer is being accepted.
    /// @param acceptedAmount The loan amount (matches lender's deposit).
    /// @param acceptedApr   APR in basis points.
    /// @param acceptedTerm  Loan term in days.
    function acceptOffer(
        uint256 listingId,
        address lender,
        uint256 acceptedAmount,
        uint256 acceptedApr,
        uint256 acceptedTerm
    )
        external
        onlyBorrower(listingId)
        atStage(listingId, Stage.LISTED)
    {
        uint256 deposited = lenderDeposits[listingId][lender];
        require(deposited >= acceptedAmount, "Lender has insufficient deposit");
        require(deposited > 0, "No deposit from this lender");

        Listing storage l = listings[listingId];

        // Refund excess if lender sent more than accepted amount
        uint256 excess = deposited - acceptedAmount;
        if (excess > 0) {
            lenderDeposits[listingId][lender] = 0;
            (bool refunded,) = lender.call{value: excess}("");
            if (!refunded) revert TransferFailed();
        } else {
            lenderDeposits[listingId][lender] = 0;
        }
        _hasOffer[listingId][lender] = false;

        l.acceptedLender = lender;
        l.acceptedAmount = acceptedAmount;
        l.acceptedApr = acceptedApr;
        l.acceptedTerm = acceptedTerm;
        l.fundedAt = block.timestamp;
        l.stage = Stage.ACTIVE;

        // Send loan amount to borrower (minus platform fee)
        uint256 fee = (acceptedAmount * platformFeeBps) / 10000;
        uint256 net = acceptedAmount - fee;

        (bool sent,) = msg.sender.call{value: net}("");
        if (!sent) revert TransferFailed();

        if (fee > 0) {
            (bool feeSent,) = admin.call{value: fee}("");
            if (!feeSent) revert TransferFailed();
        }

        emit OfferAccepted(listingId, lender, acceptedAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //  BORROWER — repay loan
    // ═══════════════════════════════════════════════════════════

    /// @notice Borrower repays loan + interest. NFT is returned to borrower.
    function repay(uint256 listingId)
        external
        payable
        onlyBorrower(listingId)
        atStage(listingId, Stage.ACTIVE)
    {
        Listing storage l = listings[listingId];

        // repayment = principal + interest
        // interest = principal * apr * term / (365 * 10000)
        uint256 interest = (l.acceptedAmount * l.acceptedApr * l.acceptedTerm) / 3650000;
        uint256 totalDue = l.acceptedAmount + interest;

        require(msg.value >= totalDue, "Insufficient repayment");

        l.stage = Stage.REPAID;

        // Send repayment to lender
        (bool sent,) = l.acceptedLender.call{value: totalDue}("");
        if (!sent) revert TransferFailed();

        // Refund overpayment
        uint256 excess = msg.value - totalDue;
        if (excess > 0) {
            (bool refunded,) = msg.sender.call{value: excess}("");
            if (!refunded) revert TransferFailed();
        }

        // Return NFT to borrower
        IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);

        emit Repaid(listingId, totalDue);
    }

    // ═══════════════════════════════════════════════════════════
    //  LENDER — claim collateral on default
    // ═══════════════════════════════════════════════════════════

    /// @notice Lender claims the NFT collateral after the loan deadline has passed.
    function claimCollateral(uint256 listingId)
        external
        atStage(listingId, Stage.ACTIVE)
    {
        Listing storage l = listings[listingId];
        if (msg.sender != l.acceptedLender) revert NotLender();

        uint256 deadline = l.fundedAt + (l.acceptedTerm * 1 days);
        if (block.timestamp < deadline) revert DeadlineNotPassed();

        l.stage = Stage.DEFAULTED;

        // Transfer NFT to lender
        IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);

        emit DefaultClaimed(listingId, msg.sender, l.nftContract, l.nftTokenId);
    }

    // ═══════════════════════════════════════════════════════════
    //  DISPUTE — either party (only in ACTIVE stage)
    // ═══════════════════════════════════════════════════════════

    /// @notice Borrower or lender can raise a dispute during active loan.
    function dispute(uint256 listingId) external atStage(listingId, Stage.ACTIVE) {
        Listing storage l = listings[listingId];
        if (msg.sender != l.borrower && msg.sender != l.acceptedLender) revert NotLender();
        l.stage = Stage.DISPUTED;
        emit Disputed(listingId);
    }

    /// @notice Admin resolves a dispute.
    /// @param returnPrincipalToLender Amount of principal (in wei) to return to lender.
    ///        Remaining ETH in contract goes to borrower after fee.
    function resolve(uint256 listingId, uint256 returnPrincipalToLender)
        external
        onlyAdmin
        atStage(listingId, Stage.DISPUTED)
    {
        Listing storage l = listings[listingId];
        uint256 contractBalance = address(this).balance;

        require(returnPrincipalToLender <= contractBalance, "Insufficient balance");

        if (returnPrincipalToLender > 0) {
            (bool sent,) = l.acceptedLender.call{value: returnPrincipalToLender}("");
            if (!sent) revert TransferFailed();
        }

        uint256 remainder = contractBalance - returnPrincipalToLender;
        if (remainder > 0) {
            uint256 fee = (remainder * platformFeeBps) / 10000;
            uint256 net = remainder - fee;
            (bool sent,) = l.borrower.call{value: net}("");
            if (!sent) revert TransferFailed();
            if (fee > 0) {
                (bool feeSent,) = admin.call{value: fee}("");
                if (!feeSent) revert TransferFailed();
            }
        }

        // Return NFT to borrower
        l.stage = Stage.REPAID;
        IERC721(l.nftContract).safeTransferFrom(address(this), l.borrower, l.nftTokenId);

        emit Resolved(listingId, Stage.REPAID, returnPrincipalToLender, remainder);
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════════════════════

    function setPlatformFee(uint256 newFeeBps) external onlyAdmin {
        require(newFeeBps <= 500, "Max 5%");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }

    // ── View helpers ──────────────────────────────────────────

    /// @notice Returns the number of active offers on a listing.
    function getOfferCount(uint256 listingId) external view returns (uint256) {
        return _offerLenders[listingId].length;
    }

    /// @notice Returns all lender addresses who have active offers on a listing.
    function getOfferLenders(uint256 listingId) external view returns (address[] memory) {
        return _offerLenders[listingId];
    }

    /// @notice Computes the total repayment due for an active listing.
    function getRepaymentDue(uint256 listingId) external view returns (uint256) {
        Listing storage l = listings[listingId];
        uint256 interest = (l.acceptedAmount * l.acceptedApr * l.acceptedTerm) / 3650000;
        return l.acceptedAmount + interest;
    }

    /// @notice Returns the deadline timestamp for an active listing.
    function getDeadline(uint256 listingId) external view returns (uint256) {
        Listing storage l = listings[listingId];
        return l.fundedAt + (l.acceptedTerm * 1 days);
    }

    // ═══════════════════════════════════════════════════════════
    //  MINI APP LISTINGS
    // ═══════════════════════════════════════════════════════════

    enum MiniAppStage { LISTED, VERIFIED, SOLD, CANCELLED }

    struct MiniAppListing {
        address seller;
        uint256 price;
        bytes32 metadataHash;
        MiniAppStage stage;
    }

    uint256 public miniAppCount;
    mapping(uint256 => MiniAppListing) public miniApps;

    event MiniAppListed(uint256 indexed listingId, address seller, uint256 price, bytes32 metadataHash);
    event MiniAppVerified(uint256 indexed listingId);
    event MiniAppSold(uint256 indexed listingId, address buyer, uint256 amount);
    event MiniAppCancelled(uint256 indexed listingId);

    /// @notice List a mini app for sale. Stores metadata hash on-chain.
    function listMiniApp(uint256 price, bytes32 metadataHash) external returns (uint256) {
        require(price > 0, "Price must be > 0");
        miniAppCount++;
        miniApps[miniAppCount] = MiniAppListing({
            seller: msg.sender,
            price: price,
            metadataHash: metadataHash,
            stage: MiniAppStage.LISTED
        });
        emit MiniAppListed(miniAppCount, msg.sender, price, metadataHash);
        return miniAppCount;
    }

    /// @notice Seller cancels a listing.
    function cancelMiniApp(uint256 listingId) external {
        MiniAppListing storage m = miniApps[listingId];
        require(m.seller == msg.sender, "Not seller");
        require(m.stage == MiniAppStage.LISTED, "Not listed");
        m.stage = MiniAppStage.CANCELLED;
        emit MiniAppCancelled(listingId);
    }

    /// @notice Seller updates a mini app listing.
    function updateMiniApp(
        uint256 listingId,
        uint256 newPrice,
        bytes32 newMetadataHash
    ) external {
        MiniAppListing storage m = miniApps[listingId];
        require(m.seller == msg.sender, "Not seller");
        require(m.stage == MiniAppStage.LISTED, "Not listed");
        require(newPrice > 0, "Price must be > 0");
        m.price = newPrice;
        m.metadataHash = newMetadataHash;
    }

    /// @notice Admin verifies seller ownership and activates listing for buyers.
    function verifyMiniApp(uint256 listingId) external onlyAdmin {
        MiniAppListing storage m = miniApps[listingId];
        require(m.stage == MiniAppStage.LISTED, "Not in LISTED stage");
        m.stage = MiniAppStage.VERIFIED;
        emit MiniAppVerified(listingId);
    }

    receive() external payable {}
}
