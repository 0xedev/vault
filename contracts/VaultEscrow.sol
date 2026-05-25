// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VaultEscrow
 * @notice NFT-collateralised loan escrow + digital asset marketplace with two-sided escrow.
 *         1. Borrower lists NFT → NFT enters escrow → lenders offer → borrower accepts → loan.
 *         2. Seller lists digital asset → buyer funds escrow → seller delivers → buyer confirms.
 *         3. Either party can dispute → admin resolves.
 */
interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

contract VaultEscrow is IERC721Receiver {
    address public admin;
    uint256 public platformFeeBps; // basis points (150 = 1.5%)
    uint256 public constant GRACE_PERIOD = 24 hours;
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
        uint256 repaidSoFar;   // tracks partial repayments
        Stage stage;
    }

    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;

    mapping(uint256 => mapping(address => uint256)) public lenderDeposits;
    mapping(uint256 => uint256) public listingEscrowBalance;
    mapping(uint256 => address[]) private _offerLenders;
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
    event Resolved(uint256 indexed listingId, Stage outcome, uint256 buyerAmount, uint256 lenderAmount, bool nftToLender);
    event PlatformFeeUpdated(uint256 newFee);
    event ListingUpdated(uint256 indexed listingId, uint256 amount, uint256 apr, uint256 term);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

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

    constructor(uint256 _platformFeeBps) {
        admin = msg.sender;
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
    //  LENDER — submit / withdraw offer
    // ═══════════════════════════════════════════════════════════

    function submitOffer(uint256 listingId, uint256 amount, uint256 apr, uint256 term)
        external payable nonReentrant atStage(listingId, Stage.LISTED)
    {
        require(msg.value == amount, "ETH sent must equal offer amount");
        require(amount > 0, "Amount must be > 0");
        if (_hasOffer[listingId][msg.sender]) revert AlreadyOffered();

        lenderDeposits[listingId][msg.sender] = msg.value;
        listingEscrowBalance[listingId] += msg.value;
        _offerLenders[listingId].push(msg.sender);
        _hasOffer[listingId][msg.sender] = true;

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

        (bool sent,) = msg.sender.call{value: deposited}("");
        if (!sent) revert TransferFailed();

        emit OfferWithdrawn(listingId, msg.sender, deposited);
    }

    // ═══════════════════════════════════════════════════════════
    //  BORROWER — accept offer
    // ═══════════════════════════════════════════════════════════

    function acceptOffer(
        uint256 listingId, address lender, uint256 acceptedAmount,
        uint256 acceptedApr, uint256 acceptedTerm
    )
        external nonReentrant onlyBorrower(listingId) atStage(listingId, Stage.LISTED)
    {
        uint256 deposited = lenderDeposits[listingId][lender];
        require(deposited >= acceptedAmount, "Lender has insufficient deposit");
        require(deposited > 0, "No deposit from this lender");

        Listing storage l = listings[listingId];

        uint256 excess = deposited - acceptedAmount;
        if (excess > 0) {
            lenderDeposits[listingId][lender] = 0;
            listingEscrowBalance[listingId] -= excess;
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

        uint256 fee = (acceptedAmount * platformFeeBps) / 10000;
        uint256 net = acceptedAmount - fee;
        listingEscrowBalance[listingId] -= acceptedAmount;

        (bool sent,) = msg.sender.call{value: net}("");
        if (!sent) revert TransferFailed();

        if (fee > 0) {
            (bool feeSent,) = admin.call{value: fee}("");
            if (!feeSent) revert TransferFailed();
        }

        emit OfferAccepted(listingId, lender, acceptedAmount);
    }

    // ═══════════════════════════════════════════════════════════
    //  BORROWER — repay loan (full + partial)
    // ═══════════════════════════════════════════════════════════

    function repay(uint256 listingId)
        external payable nonReentrant onlyBorrower(listingId) atStage(listingId, Stage.ACTIVE)
    {
        Listing storage l = listings[listingId];
        uint256 interest = (l.acceptedAmount * l.acceptedApr * l.acceptedTerm) / 3650000;
        uint256 totalDue = l.acceptedAmount + interest;
        uint256 remaining = totalDue - l.repaidSoFar;

        require(msg.value >= remaining, "Insufficient repayment");

        l.stage = Stage.REPAID;

        (bool sent,) = l.acceptedLender.call{value: remaining}("");
        if (!sent) revert TransferFailed();

        uint256 excess = msg.value - remaining;
        if (excess > 0) {
            (bool refunded,) = msg.sender.call{value: excess}("");
            if (!refunded) revert TransferFailed();
        }

        IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);

        emit Repaid(listingId, totalDue);
    }

    /// @notice Partial repayment. Reduces outstanding balance without closing the loan.
    function repayPartial(uint256 listingId)
        external payable nonReentrant onlyBorrower(listingId) atStage(listingId, Stage.ACTIVE)
    {
        require(msg.value > 0, "Amount must be > 0");

        Listing storage l = listings[listingId];
        uint256 interest = (l.acceptedAmount * l.acceptedApr * l.acceptedTerm) / 3650000;
        uint256 totalDue = l.acceptedAmount + interest;
        uint256 remaining = totalDue - l.repaidSoFar;

        require(msg.value <= remaining, "Overpayment — use repay() to close");

        l.repaidSoFar += msg.value;

        (bool sent,) = l.acceptedLender.call{value: msg.value}("");
        if (!sent) revert TransferFailed();

        if (l.repaidSoFar >= totalDue) {
            l.stage = Stage.REPAID;
            IERC721(l.nftContract).safeTransferFrom(address(this), msg.sender, l.nftTokenId);
        }

        emit Repaid(listingId, msg.value);
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

    /// @notice Admin resolves a loan dispute. Can return NFT to lender if appropriate.
    /// @param returnPrincipalToLender ETH to return to lender
    /// @param nftToLender If true, NFT goes to lender instead of borrower
    function resolve(uint256 listingId, uint256 returnPrincipalToLender, bool nftToLender)
        external onlyAdmin nonReentrant atStage(listingId, Stage.DISPUTED)
    {
        Listing storage l = listings[listingId];
        uint256 contractBalance = listingEscrowBalance[listingId];

        require(returnPrincipalToLender <= contractBalance, "Insufficient balance");

        if (returnPrincipalToLender > 0) {
            (bool sent,) = l.acceptedLender.call{value: returnPrincipalToLender}("");
            if (!sent) revert TransferFailed();
        }

        uint256 remainder = contractBalance - returnPrincipalToLender;
        listingEscrowBalance[listingId] = 0;
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

        // Return NFT based on resolution
        address nftRecipient = nftToLender ? l.acceptedLender : l.borrower;
        l.stage = Stage.REPAID;
        IERC721(l.nftContract).safeTransferFrom(address(this), nftRecipient, l.nftTokenId);

        emit Resolved(listingId, Stage.REPAID, returnPrincipalToLender, remainder, nftToLender);
    }

    // ═══════════════════════════════════════════════════════════
    //  DIGITAL ASSET ESCROW (Mini Apps, X Accounts, Farcaster, Clanker)
    // ═══════════════════════════════════════════════════════════

    enum DealStage { LISTED, VERIFIED, FUNDED, DELIVERED, CONFIRMED, DISPUTED, RESOLVED, REFUNDED, CANCELLED }

    struct Deal {
        address seller;
        address buyer;
        uint256 price;
        bytes32 metadataHash;
        uint256 deadline;       // delivery deadline set when funded
        uint256 createdAt;      // block timestamp when listed
        DealStage stage;
        uint256 buyerAmount;    // admin resolution: ETH to return to buyer
        uint256 sellerAmount;   // admin resolution: ETH to release to seller
    }

    uint256 public dealCount;
    mapping(uint256 => Deal) public deals;

    // Track ETH locked per deal
    mapping(uint256 => uint256) public dealEscrowBalance;

    event DealListed(uint256 indexed dealId, address seller, uint256 price, bytes32 metadataHash);
    event DealFunded(uint256 indexed dealId, address buyer, uint256 amount);
    event DealDelivered(uint256 indexed dealId);
    event DealConfirmed(uint256 indexed dealId, uint256 sellerAmount);
    event DealDisputed(uint256 indexed dealId);
    event DealResolved(uint256 indexed dealId, uint256 buyerAmount, uint256 sellerAmount);
    event DealRefunded(uint256 indexed dealId);
    event DealCancelled(uint256 indexed dealId);
    event DealDeadlineExtended(uint256 indexed dealId, uint256 newDeadline);

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

    /// @notice Seller lists a digital asset for sale. Stores metadata hash on-chain.
    /// @param price Asking price in wei
    /// @param metadataHash Hash of off-chain metadata (name, description, deliverables, etc.)
    /// @return dealId The new listing ID
    function listDeal(uint256 price, bytes32 metadataHash) external returns (uint256) {
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
        external nonReentrant onlySeller(dealId) atDealStage(dealId, DealStage.LISTED)
    {
        deals[dealId].stage = DealStage.CANCELLED;
        emit DealCancelled(dealId);
    }

    /// @notice Seller updates listing price + metadata.
    function updateDeal(uint256 dealId, uint256 newPrice, bytes32 newMetadataHash)
        external onlySeller(dealId) atDealStage(dealId, DealStage.LISTED)
    {
        require(newPrice > 0, "Price must be > 0");
        deals[dealId].price = newPrice;
        deals[dealId].metadataHash = newMetadataHash;
    }

    /// @notice Admin verifies seller ownership, activating the listing for buyers.
    function verifyDeal(uint256 dealId)
        external onlyAdmin atDealStage(dealId, DealStage.LISTED)
    {
        deals[dealId].stage = DealStage.VERIFIED;
        emit DealDelivered(dealId); // reuse event — just means "activated"
    }

    /// @notice Buyer funds the escrow. ETH locked until delivery is confirmed or disputed.
    /// @param dealId The listing to purchase
    function fundDeal(uint256 dealId)
        external payable nonReentrant atDealStage(dealId, DealStage.VERIFIED)
    {
        Deal storage d = deals[dealId];
        require(msg.sender != d.seller, "Seller cannot buy own listing");
        require(msg.value == d.price, "ETH sent must equal listing price");

        d.buyer = msg.sender;
        d.stage = DealStage.FUNDED;
        d.deadline = block.timestamp + 7 days; // seller has 7 days to deliver
        dealEscrowBalance[dealId] = msg.value;

        emit DealFunded(dealId, msg.sender, msg.value);
    }

    /// @notice Seller marks the asset as delivered. Buyer must confirm within 3 days.
    function markDelivered(uint256 dealId)
        external nonReentrant onlySeller(dealId) atDealStage(dealId, DealStage.FUNDED)
    {
        Deal storage d = deals[dealId];
        require(block.timestamp < d.deadline, "Delivery deadline passed");

        d.stage = DealStage.DELIVERED;
        d.deadline = block.timestamp + 3 days; // buyer has 3 days to confirm

        emit DealDelivered(dealId);
    }

    /// @notice Seller extends the delivery deadline (once, max 7 days total from fund).
    function extendDeadline(uint256 dealId)
        external onlySeller(dealId) atDealStage(dealId, DealStage.FUNDED)
    {
        Deal storage d = deals[dealId];
        // Allow extending up to 14 days from funding
        uint256 maxDeadline = d.createdAt + 14 days;
        uint256 newDeadline = block.timestamp + 3 days;
        require(newDeadline <= maxDeadline, "Cannot extend beyond 14 days");
        d.deadline = newDeadline;
        emit DealDeadlineExtended(dealId, newDeadline);
    }

    /// @notice Buyer confirms receipt. Funds released to seller (minus platform fee).
    function confirmDelivery(uint256 dealId)
        external nonReentrant onlyBuyer(dealId) atDealStage(dealId, DealStage.DELIVERED)
    {
        Deal storage d = deals[dealId];
        uint256 fee = (d.price * platformFeeBps) / 10000;
        uint256 net = d.price - fee;

        d.stage = DealStage.CONFIRMED;
        dealEscrowBalance[dealId] = 0;

        (bool sent,) = d.seller.call{value: net}("");
        if (!sent) revert TransferFailed();

        if (fee > 0) {
            (bool feeSent,) = admin.call{value: fee}("");
            if (!feeSent) revert TransferFailed();
        }

        emit DealConfirmed(dealId, net);
    }

    /// @notice Either party disputes the deal.
    function disputeDeal(uint256 dealId)
        external onlyDealParty(dealId) atDealStage(dealId, DealStage.DELIVERED)
    {
        deals[dealId].stage = DealStage.DISPUTED;
        emit DealDisputed(dealId);
    }

    /// @notice Admin resolves a deal dispute. Splits funds between buyer and seller.
    /// @param buyerAmount ETH to return to buyer
    /// @param sellerAmount ETH to release to seller
    function resolveDeal(uint256 dealId, uint256 buyerAmount, uint256 sellerAmount)
        external onlyAdmin nonReentrant atDealStage(dealId, DealStage.DISPUTED)
    {
        Deal storage d = deals[dealId];
        uint256 balance = dealEscrowBalance[dealId];
        require(buyerAmount + sellerAmount <= balance, "Amounts exceed escrow balance");

        d.stage = DealStage.RESOLVED;
        d.buyerAmount = buyerAmount;
        d.sellerAmount = sellerAmount;
        dealEscrowBalance[dealId] = 0;

        if (buyerAmount > 0) {
            (bool sent,) = d.buyer.call{value: buyerAmount}("");
            if (!sent) revert TransferFailed();
        }
        if (sellerAmount > 0) {
            uint256 fee = (sellerAmount * platformFeeBps) / 10000;
            uint256 net = sellerAmount - fee;
            (bool sent,) = d.seller.call{value: net}("");
            if (!sent) revert TransferFailed();
            if (fee > 0) {
                (bool feeSent,) = admin.call{value: fee}("");
                if (!feeSent) revert TransferFailed();
            }
        }

        // Remaining dust to admin
        uint256 dust = balance - buyerAmount - sellerAmount;
        if (dust > 0) {
            (bool dustSent,) = admin.call{value: dust}("");
            if (!dustSent) revert TransferFailed();
        }

        emit DealResolved(dealId, buyerAmount, sellerAmount);
    }

    /// @notice Buyer claims refund if seller misses delivery deadline.
    function refundDeal(uint256 dealId)
        external nonReentrant onlyBuyer(dealId) atDealStage(dealId, DealStage.FUNDED)
    {
        Deal storage d = deals[dealId];
        require(block.timestamp > d.deadline, "Deadline not passed");

        d.stage = DealStage.REFUNDED;
        uint256 amount = dealEscrowBalance[dealId];
        dealEscrowBalance[dealId] = 0;

        (bool sent,) = d.buyer.call{value: amount}("");
        if (!sent) revert TransferFailed();

        emit DealRefunded(dealId);
    }

    // ═══════════════════════════════════════════════════════════
    //  BACKWARD COMPATIBILITY — MiniApp (wraps Deal system)
    // ═══════════════════════════════════════════════════════════

    uint256 public miniAppCount; // mirror of dealCount for backward compat
    mapping(uint256 => uint256) private _miniAppToDeal; // miniAppId → dealId

    event MiniAppListed(uint256 indexed listingId, address seller, uint256 price, bytes32 metadataHash);
    event MiniAppVerified(uint256 indexed listingId);
    event MiniAppSold(uint256 indexed listingId, address buyer, uint256 amount);
    event MiniAppCancelled(uint256 indexed listingId);

    /// @notice Backward-compatible wrapper — calls listDeal under the hood.
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

    function verifyMiniApp(uint256 miniAppId) external onlyAdmin {
        uint256 dealId = _miniAppToDeal[miniAppId];
        require(dealId > 0, "Not found");
        verifyDeal(dealId);
        emit MiniAppVerified(miniAppId);
    }

    /// @notice Buyer purchases a verified mini app — funds escrow + auto-confirms.
    function buyMiniApp(uint256 miniAppId) external payable nonReentrant {
        uint256 dealId = _miniAppToDeal[miniAppId];
        require(dealId > 0, "Not found");
        require(deals[dealId].stage == DealStage.VERIFIED, "Not verified");
        require(msg.value == deals[dealId].price, "Incorrect payment");

        fundDeal(dealId);
        markDelivered(dealId);
        confirmDelivery(dealId);

        emit MiniAppSold(miniAppId, msg.sender, msg.value);
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

    receive() external payable {}
}
