// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VaultEscrow
 * @notice NFT-collateralised loan escrow + digital asset marketplace with two-sided escrow.
 *         1. Borrower lists NFT → NFT enters escrow → lenders offer → borrower accepts → loan.
 *         2. Seller lists digital asset → buyers offer (or pay full ask) → seller accepts → escrow.
 *         3. Seller delivers → buyer confirms → funds release.
 *         4. Either party can dispute → admin resolves.
 *
 *         All payments are in USDC (ERC20). No native ETH handled.
 */
interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract VaultEscrow is IERC721Receiver {
    address public admin;
    IERC20 public immutable usdc;
    uint256 public platformFeeBps; // basis points (150 = 1.5%)
    uint256 public constant GRACE_PERIOD = 24 hours;
    bool public paused;
    bool private _entered;

    // ═══════════════════════════════════════════════════════════
    //  NFT LOAN SYSTEM
    // ═══════════════════════════════════════════════════════════

    enum Stage { LISTED, FUNDED, ACTIVE, REPAID, DEFAULTED, CANCELLED, DISPUTED }

    struct Listing {
        address borrower;
        address nftContract;
        uint256 nftTokenId;
        uint256 principal;
        uint256 apr;
        uint256 term;
        address acceptedLender;
        uint256 acceptedAmount;
        uint256 acceptedApr;
        uint256 acceptedTerm;
        uint256 fundedAt;
        uint256 repaidSoFar;   // tracks partial repayments (USDC)
        Stage stage;
    }

    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;

    mapping(uint256 => mapping(address => uint256)) public lenderDeposits;
    mapping(uint256 => uint256) public listingEscrowBalance;
    mapping(uint256 => address[]) private _offerLenders;
    mapping(uint256 => mapping(address => bool)) private _hasOffer;

    /// @notice Tracks the APR and term each lender offered, so it can be validated on accept.
    struct Offer {
        uint256 apr;
        uint256 term;
    }
    mapping(uint256 => mapping(address => Offer)) public offers;

    // ── Events ────────────────────────────────────────────────
    event Listed(uint256 indexed listingId, address borrower, address nftContract, uint256 tokenId, uint256 amount, uint256 apr, uint256 term);
    event Cancelled(uint256 indexed listingId);
    event OfferSubmitted(uint256 indexed listingId, address lender, uint256 amount, uint256 apr, uint256 term);
    event OfferWithdrawn(uint256 indexed listingId, address lender, uint256 amount);
    event OfferAccepted(uint256 indexed listingId, address lender, uint256 amount);
    event Repaid(uint256 indexed listingId, uint256 amount);
    event DefaultClaimed(uint256 indexed listingId, address lender, address nftContract, uint256 tokenId);
    event Disputed(uint256 indexed listingId);
    event Resolved(uint256 indexed listingId, Stage outcome, bool nftToLender);
    event PlatformFeeUpdated(uint256 newFee);
    event ListingUpdated(uint256 indexed listingId, uint256 amount, uint256 apr, uint256 term);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    event Paused();
    event Unpaused();

    // ── Errors ────────────────────────────────────────────────
    error NotAdmin();
    error NotBorrower();
    error NotLender();
    error NotDealParty();
    error InvalidStage(Stage current, Stage expected);
    error InvalidDealStage(DealStage current, DealStage expected);
    error DeadlineNotPassed();
    error DeadlinePassed();
    error GracePeriodNotPassed();
    error NotNFTOwner();
    error OfferExpired();
    error NoActiveOffer();
    error TransferFailed();
    error AlreadyOffered();
    error ContractPaused();
    error OfferMismatch();

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

    modifier nonReentrant() {
        require(!_entered, "Reentrant call");
        _entered = true;
        _;
        _entered = false;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    constructor(address _usdc, uint256 _platformFeeBps) {
        admin = msg.sender;
        usdc = IERC20(_usdc);
        platformFeeBps = _platformFeeBps;
    }

    // ═══════════════════════════════════════════════════════════
    //  BORROWER — list / cancel / update
    // ═══════════════════════════════════════════════════════════

    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 apr,
        uint256 term
    ) external nonReentrant returns (uint256) {
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
            repaidSoFar: 0,
            stage: Stage.LISTED
        });

        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        emit Listed(listingCount, msg.sender, nftContract, tokenId, amount, apr, term);
        return listingCount;
    }

    function cancelListing(uint256 listingId)
        external nonReentrant onlyBorrower(listingId) atStage(listingId, Stage.LISTED)
    {
        Listing storage l = listings[listingId];
        l.stage = Stage.CANCELLED;
        IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);
        emit Cancelled(listingId);
    }

    function updateListing(uint256 listingId, uint256 newAmount, uint256 newApr, uint256 newTerm)
        external onlyBorrower(listingId) atStage(listingId, Stage.LISTED)
    {
        Listing storage l = listings[listingId];
        require(newAmount > 0, "Amount must be > 0");
        require(newTerm > 0, "Term must be > 0");
        l.principal = newAmount;
        l.apr = newApr;
        l.term = newTerm;
        emit ListingUpdated(listingId, newAmount, newApr, newTerm);
    }

    // ═══════════════════════════════════════════════════════════
    //  LENDER — submit / withdraw offer (USDC via transferFrom)
    // ═══════════════════════════════════════════════════════════

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
        offers[listingId][msg.sender] = Offer({ apr: apr, term: term });

        emit OfferSubmitted(listingId, msg.sender, amount, apr, term);
    }

    function withdrawOffer(uint256 listingId) external nonReentrant {
        uint256 deposited = lenderDeposits[listingId][msg.sender];
        require(deposited > 0, "No deposit for this listing");

        Listing storage l = listings[listingId];
        require(
            l.stage == Stage.LISTED || msg.sender != l.acceptedLender,
            "Accepted offer cannot be withdrawn"
        );

        lenderDeposits[listingId][msg.sender] = 0;
        listingEscrowBalance[listingId] -= deposited;
        _hasOffer[listingId][msg.sender] = false;
        delete offers[listingId][msg.sender];

        if (!usdc.transfer(msg.sender, deposited)) revert TransferFailed();

        emit OfferWithdrawn(listingId, msg.sender, deposited);
    }

    // ═══════════════════════════════════════════════════════════
    //  BORROWER — accept offer
    // ═══════════════════════════════════════════════════════════

    function acceptOffer(
        uint256 listingId, address lender, uint256 acceptedAmount,
        uint256 acceptedApr, uint256 acceptedTerm
    )
        external nonReentrant whenNotPaused onlyBorrower(listingId) atStage(listingId, Stage.LISTED)
    {
        uint256 deposited = lenderDeposits[listingId][lender];
        require(deposited >= acceptedAmount, "Lender has insufficient deposit");
        require(acceptedAmount > 0, "Amount must be > 0");
        require(deposited > 0, "No deposit from this lender");

        // Validate accepted APR and term match what the lender offered
        Offer memory offer = offers[listingId][lender];
        if (offer.apr != acceptedApr || offer.term != acceptedTerm) revert OfferMismatch();

        Listing storage l = listings[listingId];

        // Refund excess to lender
        uint256 excess = deposited - acceptedAmount;
        if (excess > 0) {
            listingEscrowBalance[listingId] -= excess;
            if (!usdc.transfer(lender, excess)) revert TransferFailed();
        }
        lenderDeposits[listingId][lender] = 0;
        _hasOffer[listingId][lender] = false;

        l.acceptedLender = lender;
        l.acceptedAmount = acceptedAmount;
        l.acceptedApr = acceptedApr;
        l.acceptedTerm = acceptedTerm;
        l.fundedAt = block.timestamp;
        l.stage = Stage.ACTIVE;

        uint256 fee = (acceptedAmount * platformFeeBps) / 10000;
        uint256 net = acceptedAmount - fee;
        listingEscrowBalance[listingId] -= acceptedAmount;

        if (!usdc.transfer(msg.sender, net)) revert TransferFailed();

        if (fee > 0) {
            if (!usdc.transfer(admin, fee)) revert TransferFailed();
        }

        emit OfferAccepted(listingId, lender, acceptedAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //  BORROWER — repay loan (full + partial, USDC via transferFrom)
    // ═══════════════════════════════════════════════════════════

    function repay(uint256 listingId, uint256 amount)
        external nonReentrant onlyBorrower(listingId) atStage(listingId, Stage.ACTIVE)
    {
        Listing storage l = listings[listingId];
        uint256 interest = (l.acceptedAmount * l.acceptedApr * l.acceptedTerm) / 3650000;
        uint256 totalDue = l.acceptedAmount + interest;
        uint256 remaining = totalDue - l.repaidSoFar;

        require(amount >= remaining, "Insufficient repayment");

        // Pull the full amount — includes any overpayment for refund
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();

        l.stage = Stage.REPAID;

        // Send what's owed to lender
        if (!usdc.transfer(l.acceptedLender, remaining)) revert TransferFailed();

        // Refund overpayment to borrower
        uint256 overpay = amount - remaining;
        if (overpay > 0) {
            if (!usdc.transfer(msg.sender, overpay)) revert TransferFailed();
        }

        IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);

        emit Repaid(listingId, totalDue);
    }

    /// @notice Partial repayment. Reduces outstanding balance without closing the loan.
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

    // ═══════════════════════════════════════════════════════════
    //  LENDER — claim collateral on default (with grace period)
    // ═══════════════════════════════════════════════════════════

    function claimCollateral(uint256 listingId)
        external nonReentrant atStage(listingId, Stage.ACTIVE)
    {
        Listing storage l = listings[listingId];
        if (msg.sender != l.acceptedLender) revert NotLender();

        uint256 deadline = l.fundedAt + (l.acceptedTerm * 1 days) + GRACE_PERIOD;
        if (block.timestamp < deadline) revert GracePeriodNotPassed();

        l.stage = Stage.DEFAULTED;
        IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);

        emit DefaultClaimed(listingId, msg.sender, l.nftContract, l.nftTokenId);
    }

    // ═══════════════════════════════════════════════════════════
    //  DISPUTE — either party (NFT loans)
    // ═══════════════════════════════════════════════════════════

    function dispute(uint256 listingId) external atStage(listingId, Stage.ACTIVE) {
        Listing storage l = listings[listingId];
        if (msg.sender != l.borrower && msg.sender != l.acceptedLender) revert NotLender();
        l.stage = Stage.DISPUTED;
        emit Disputed(listingId);
    }

    /// @notice Admin resolves a loan dispute. Transfers NFT to lender or borrower.
    function resolve(uint256 listingId, bool nftToLender)
        external onlyAdmin nonReentrant atStage(listingId, Stage.DISPUTED)
    {
        Listing storage l = listings[listingId];

        address nftRecipient = nftToLender ? l.acceptedLender : l.borrower;
        l.stage = Stage.REPAID;
        IERC721(l.nftContract).safeTransferFrom(address(this), nftRecipient, l.nftTokenId);

        emit Resolved(listingId, Stage.REPAID, nftToLender);
    }

    // ═══════════════════════════════════════════════════════════
    //  DIGITAL ASSET ESCROW (Mini Apps, X Accounts, Farcaster, Clanker, Bundles)
    //  No admin verification — listings go LISTED → directly fundable.
    //  Buyers can offer any amount; seller picks the winning offer.
    // ═══════════════════════════════════════════════════════════

    enum DealStage { LISTED, FUNDED, DELIVERED, CONFIRMED, DISPUTED, RESOLVED, REFUNDED, CANCELLED }

    struct Deal {
        address seller;
        address buyer;
        uint256 price;          // listing price (updated to accepted amount on offer accept)
        bytes32 metadataHash;
        uint256 deadline;       // delivery deadline set when funded
        uint256 createdAt;      // block timestamp when listed
        DealStage stage;
        uint256 buyerAmount;    // admin resolution: USDC to return to buyer
        uint256 sellerAmount;   // admin resolution: USDC to release to seller
    }

    uint256 public dealCount;
    mapping(uint256 => Deal) public deals;

    // Track USDC locked per deal
    mapping(uint256 => uint256) public dealEscrowBalance;

    // ── Deal offer system (buyers offer an amount, seller picks the winner) ──
    mapping(uint256 => mapping(address => uint256)) public dealOfferDeposits;
    mapping(uint256 => address[]) private _dealOfferBuyers;
    mapping(uint256 => mapping(address => bool)) private _hasDealOffer;

    event DealListed(uint256 indexed dealId, address seller, uint256 price, bytes32 metadataHash);
    event DealFunded(uint256 indexed dealId, address buyer, uint256 amount);
    event DealDelivered(uint256 indexed dealId);
    event DealConfirmed(uint256 indexed dealId, uint256 sellerAmount);
    event DealDisputed(uint256 indexed dealId);
    event DealResolved(uint256 indexed dealId, uint256 buyerAmount, uint256 sellerAmount);
    event DealRefunded(uint256 indexed dealId);
    event DealCancelled(uint256 indexed dealId);
    event DealDeadlineExtended(uint256 indexed dealId, uint256 newDeadline);
    event DealOfferSubmitted(uint256 indexed dealId, address buyer, uint256 amount);
    event DealOfferWithdrawn(uint256 indexed dealId, address buyer, uint256 amount);
    event DealOfferAccepted(uint256 indexed dealId, address buyer, uint256 amount);

    modifier atDealStage(uint256 dealId, DealStage expected) {
        if (deals[dealId].stage != expected) revert InvalidDealStage(deals[dealId].stage, expected);
        _;
    }

    modifier onlySeller(uint256 dealId) {
        if (msg.sender != deals[dealId].seller) revert NotDealParty();
        _;
    }

    modifier onlyBuyer(uint256 dealId) {
        if (msg.sender != deals[dealId].buyer) revert NotDealParty();
        _;
    }

    modifier onlyDealParty(uint256 dealId) {
        Deal storage d = deals[dealId];
        if (msg.sender != d.seller && msg.sender != d.buyer) revert NotDealParty();
        _;
    }

    /// @notice Seller lists a digital asset for sale.
    /// @param price Asking price in USDC (smallest unit)
    /// @param metadataHash Hash of off-chain metadata (name, description, deliverables, etc.)
    /// @return dealId The new listing ID
    function listDeal(uint256 price, bytes32 metadataHash) public returns (uint256) {
        require(price > 0, "Price must be > 0");
        dealCount++;
        deals[dealCount] = Deal({
            seller: msg.sender,
            buyer: address(0),
            price: price,
            metadataHash: metadataHash,
            deadline: 0,
            createdAt: block.timestamp,
            stage: DealStage.LISTED,
            buyerAmount: 0,
            sellerAmount: 0
        });
        emit DealListed(dealCount, msg.sender, price, metadataHash);
        return dealCount;
    }

    /// @notice Seller cancels a listing before it's funded.
    function cancelDeal(uint256 dealId)
        public nonReentrant onlySeller(dealId) atDealStage(dealId, DealStage.LISTED)
    {
        deals[dealId].stage = DealStage.CANCELLED;
        emit DealCancelled(dealId);
    }

    /// @notice Seller updates listing price + metadata.
    function updateDeal(uint256 dealId, uint256 newPrice, bytes32 newMetadataHash)
        public onlySeller(dealId) atDealStage(dealId, DealStage.LISTED)
    {
        require(newPrice > 0, "Price must be > 0");
        deals[dealId].price = newPrice;
        deals[dealId].metadataHash = newMetadataHash;
    }

    // ═══════════════════════════════════════════════════════════
    //  BUYER — fund deal (full ask, fast path — no offer needed)
    // ═══════════════════════════════════════════════════════════

    /// @notice Buyer funds the escrow at full listed price. USDC transferred in.
    function fundDeal(uint256 dealId, uint256 amount)
        public nonReentrant whenNotPaused atDealStage(dealId, DealStage.LISTED)
    {
        Deal storage d = deals[dealId];
        require(msg.sender != d.seller, "Seller cannot buy own listing");
        require(amount == d.price, "Amount must equal listing price");

        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();

        d.buyer = msg.sender;
        d.stage = DealStage.FUNDED;
        d.deadline = block.timestamp + 7 days; // seller has 7 days to deliver
        dealEscrowBalance[dealId] = amount;

        emit DealFunded(dealId, msg.sender, amount);
    }

    // ═══════════════════════════════════════════════════════════
    //  BUYER — submit deal offer (negotiable amount, USDC locked)
    // ═══════════════════════════════════════════════════════════

    function submitDealOffer(uint256 dealId, uint256 amount)
        external nonReentrant whenNotPaused atDealStage(dealId, DealStage.LISTED)
    {
        require(amount > 0, "Amount must be > 0");
        require(msg.sender != deals[dealId].seller, "Seller cannot offer on own listing");
        if (_hasDealOffer[dealId][msg.sender]) revert AlreadyOffered();

        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();

        dealOfferDeposits[dealId][msg.sender] = amount;
        _dealOfferBuyers[dealId].push(msg.sender);
        _hasDealOffer[dealId][msg.sender] = true;

        emit DealOfferSubmitted(dealId, msg.sender, amount);
    }

    /// @notice Buyer withdraws an unaccepted offer.
    function withdrawDealOffer(uint256 dealId) external nonReentrant {
        uint256 deposited = dealOfferDeposits[dealId][msg.sender];
        require(deposited > 0, "No deposit for this deal");

        dealOfferDeposits[dealId][msg.sender] = 0;
        _hasDealOffer[dealId][msg.sender] = false;

        if (!usdc.transfer(msg.sender, deposited)) revert TransferFailed();

        emit DealOfferWithdrawn(dealId, msg.sender, deposited);
    }

    /// @notice Seller accepts a deal offer. Rejected offers are auto-refunded.
    function acceptDealOffer(uint256 dealId, address buyer)
        external nonReentrant onlySeller(dealId) atDealStage(dealId, DealStage.LISTED)
    {
        uint256 deposited = dealOfferDeposits[dealId][buyer];
        require(deposited > 0, "No deposit from this buyer");

        Deal storage d = deals[dealId];
        d.buyer = buyer;
        d.price = deposited;           // deal price = accepted offer
        d.stage = DealStage.FUNDED;
        d.deadline = block.timestamp + 7 days;
        dealEscrowBalance[dealId] = deposited;

        // Clear accepted buyer's deposit (USDC stays in escrow as deal balance)
        dealOfferDeposits[dealId][buyer] = 0;
        _hasDealOffer[dealId][buyer] = false;

        // Auto-refund all other offerers, then clear the array
        address[] storage offerers = _dealOfferBuyers[dealId];
        for (uint256 i = 0; i < offerers.length; i++) {
            address other = offerers[i];
            if (other != buyer && dealOfferDeposits[dealId][other] > 0) {
                uint256 refund = dealOfferDeposits[dealId][other];
                dealOfferDeposits[dealId][other] = 0;
                _hasDealOffer[dealId][other] = false;
                if (!usdc.transfer(other, refund)) revert TransferFailed();
            }
        }
        delete _dealOfferBuyers[dealId];

        emit DealOfferAccepted(dealId, buyer, deposited);
        emit DealFunded(dealId, buyer, deposited);
    }

    // ═══════════════════════════════════════════════════════════
    //  SELLER — mark delivered / extend deadline
    // ═══════════════════════════════════════════════════════════

    function markDelivered(uint256 dealId)
        public nonReentrant onlySeller(dealId) atDealStage(dealId, DealStage.FUNDED)
    {
        Deal storage d = deals[dealId];
        require(block.timestamp < d.deadline, "Delivery deadline passed");

        d.stage = DealStage.DELIVERED;
        d.deadline = block.timestamp + 3 days; // buyer has 3 days to confirm

        emit DealDelivered(dealId);
    }

    function extendDeadline(uint256 dealId)
        public nonReentrant onlySeller(dealId) atDealStage(dealId, DealStage.FUNDED)
    {
        Deal storage d = deals[dealId];
        uint256 maxDeadline = d.createdAt + 14 days;
        uint256 newDeadline = d.deadline + 3 days;
        require(newDeadline <= maxDeadline, "Cannot extend beyond 14 days");
        d.deadline = newDeadline;
        emit DealDeadlineExtended(dealId, newDeadline);
    }

    // ═══════════════════════════════════════════════════════════
    //  BUYER — confirm delivery / refund / dispute
    // ═══════════════════════════════════════════════════════════

    function confirmDelivery(uint256 dealId)
        public nonReentrant whenNotPaused onlyBuyer(dealId) atDealStage(dealId, DealStage.DELIVERED)
    {
        Deal storage d = deals[dealId];
        uint256 fee = (d.price * platformFeeBps) / 10000;
        uint256 net = d.price - fee;

        d.stage = DealStage.CONFIRMED;
        dealEscrowBalance[dealId] = 0;

        if (!usdc.transfer(d.seller, net)) revert TransferFailed();

        if (fee > 0) {
            if (!usdc.transfer(admin, fee)) revert TransferFailed();
        }

        emit DealConfirmed(dealId, net);
    }

    function disputeDeal(uint256 dealId)
        public onlyDealParty(dealId) atDealStage(dealId, DealStage.DELIVERED)
    {
        deals[dealId].stage = DealStage.DISPUTED;
        emit DealDisputed(dealId);
    }

    function resolveDeal(uint256 dealId, uint256 buyerAmount, uint256 sellerAmount)
        public onlyAdmin nonReentrant atDealStage(dealId, DealStage.DISPUTED)
    {
        Deal storage d = deals[dealId];
        uint256 balance = dealEscrowBalance[dealId];
        require(buyerAmount + sellerAmount <= balance, "Amounts exceed escrow balance");

        d.stage = DealStage.RESOLVED;
        d.buyerAmount = buyerAmount;
        d.sellerAmount = sellerAmount;
        dealEscrowBalance[dealId] = 0;

        if (buyerAmount > 0) {
            if (!usdc.transfer(d.buyer, buyerAmount)) revert TransferFailed();
        }
        if (sellerAmount > 0) {
            uint256 fee = (sellerAmount * platformFeeBps) / 10000;
            uint256 net = sellerAmount - fee;
            if (!usdc.transfer(d.seller, net)) revert TransferFailed();
            if (fee > 0) {
                if (!usdc.transfer(admin, fee)) revert TransferFailed();
            }
        }

        // Remaining dust to admin
        uint256 dust = balance - buyerAmount - sellerAmount;
        if (dust > 0) {
            if (!usdc.transfer(admin, dust)) revert TransferFailed();
        }

        emit DealResolved(dealId, buyerAmount, sellerAmount);
    }

    function refundDeal(uint256 dealId)
        public nonReentrant onlyBuyer(dealId) atDealStage(dealId, DealStage.FUNDED)
    {
        Deal storage d = deals[dealId];
        require(block.timestamp > d.deadline, "Deadline not passed");

        d.stage = DealStage.REFUNDED;
        uint256 amount = dealEscrowBalance[dealId];
        dealEscrowBalance[dealId] = 0;

        if (!usdc.transfer(d.buyer, amount)) revert TransferFailed();

        emit DealRefunded(dealId);
    }

    // ═══════════════════════════════════════════════════════════
    //  BACKWARD COMPATIBILITY — MiniApp (wraps Deal system)
    // ═══════════════════════════════════════════════════════════

    uint256 public miniAppCount;
    mapping(uint256 => uint256) private _miniAppToDeal;

    event MiniAppListed(uint256 indexed listingId, address seller, uint256 price, bytes32 metadataHash);
    event MiniAppSold(uint256 indexed listingId, address buyer, uint256 amount);
    event MiniAppCancelled(uint256 indexed listingId);

    function listMiniApp(uint256 price, bytes32 metadataHash) external returns (uint256) {
        uint256 dealId = listDeal(price, metadataHash);
        miniAppCount++;
        _miniAppToDeal[miniAppCount] = dealId;
        emit MiniAppListed(miniAppCount, msg.sender, price, metadataHash);
        return miniAppCount;
    }

    function cancelMiniApp(uint256 miniAppId) external {
        uint256 dealId = _miniAppToDeal[miniAppId];
        require(dealId > 0, "Not found");
        cancelDeal(dealId);
        emit MiniAppCancelled(miniAppId);
    }

    function updateMiniApp(uint256 miniAppId, uint256 newPrice, bytes32 newMetadataHash) external {
        uint256 dealId = _miniAppToDeal[miniAppId];
        require(dealId > 0, "Not found");
        updateDeal(dealId, newPrice, newMetadataHash);
    }

    /// @notice Buyer purchases directly at full price (no offer needed). USDC transferred in.
    function buyMiniApp(uint256 miniAppId, uint256 amount)
        external nonReentrant whenNotPaused
    {
        uint256 dealId = _miniAppToDeal[miniAppId];
        require(dealId > 0, "Not found");
        Deal storage d = deals[dealId];
        require(d.stage == DealStage.LISTED, "Not available");
        require(msg.sender != d.seller, "Seller cannot buy own listing");
        require(amount == d.price, "Amount must equal listing price");

        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();

        d.buyer = msg.sender;
        d.stage = DealStage.CONFIRMED;

        uint256 fee = (d.price * platformFeeBps) / 10000;
        uint256 net = d.price - fee;

        if (!usdc.transfer(d.seller, net)) revert TransferFailed();

        if (fee > 0) {
            if (!usdc.transfer(admin, fee)) revert TransferFailed();
        }

        emit DealFunded(dealId, msg.sender, amount);
        emit DealConfirmed(dealId, net);
        emit MiniAppSold(miniAppId, msg.sender, amount);
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
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminTransferred(oldAdmin, newAdmin);
    }

    function pause() external onlyAdmin {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ═══════════════════════════════════════════════════════════
    //  VIEW HELPERS
    // ═══════════════════════════════════════════════════════════

    function getOfferCount(uint256 listingId) external view returns (uint256) {
        return _offerLenders[listingId].length;
    }

    function getOfferLenders(uint256 listingId) external view returns (address[] memory) {
        return _offerLenders[listingId];
    }

    function getDealOfferCount(uint256 dealId) external view returns (uint256) {
        return _dealOfferBuyers[dealId].length;
    }

    function getDealOfferBuyers(uint256 dealId) external view returns (address[] memory) {
        return _dealOfferBuyers[dealId];
    }

    function getRepaymentDue(uint256 listingId) external view returns (uint256 totalDue, uint256 paid, uint256 remaining) {
        Listing storage l = listings[listingId];
        uint256 interest = (l.acceptedAmount * l.acceptedApr * l.acceptedTerm) / 3650000;
        totalDue = l.acceptedAmount + interest;
        paid = l.repaidSoFar;
        remaining = totalDue - paid;
    }

    function getDeadline(uint256 listingId) external view returns (uint256) {
        Listing storage l = listings[listingId];
        return l.fundedAt + (l.acceptedTerm * 1 days);
    }
}
