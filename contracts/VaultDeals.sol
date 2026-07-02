// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./VaultCore.sol";

/**
 * @title VaultDeals
 * @notice Digital-asset escrow with deal-offer system. Sellers list deals
 *         (price + metadata hash), buyers fund at full price or submit
 *         offers. Upon funding the deal becomes active; seller marks
 *         delivery and buyer confirms. Disputes are resolved by admins.
 *         Also includes a MiniApp wrapper for turn-key listings.
 */
contract VaultDeals is VaultCore {
    /// @notice Lifecycle of a deal.
    enum DealStage { LISTED, FUNDED, DELIVERED, CONFIRMED, DISPUTED, RESOLVED, REFUNDED, CANCELLED }

    /// @notice Compact market kind for generic deal listings.
    enum DealKind { OTC, MINI_APP, X_ACCOUNT, FARCASTER, CLANKER, BUNDLE }

    /// @notice Core deal data stored on-chain.
    struct Deal {
        address seller;         ///< Who created the deal.
        address buyer;          ///< Who funded / accepted the deal.
        uint256 price;          ///< Agreed USDC amount (6 decimals).
        bytes32 metadataHash;   ///< Opaque hash referencing off-chain deal metadata.
        uint256 deadline;       ///< Unix timestamp for buyer action window.
        uint256 createdAt;      ///< Block timestamp when deal was listed.
        DealStage stage;        ///< Current lifecycle stage.
        uint256 buyerAmount;    ///< Amount awarded to buyer on resolution.
        uint256 sellerAmount;   ///< Amount awarded to seller on resolution.
    }

    /// @notice EIP-712 signed deal offer terms.
    struct SignedDealOffer {
        uint256 dealId;
        address buyer;
        uint256 amount;
        uint256 expiry;
        uint256 nonce;
    }

    /// @notice Compact summary for indexer-independent deal detail reads.
    struct DealSummary {
        uint256 id;
        Deal deal;
        DealKind kind;
        uint256 miniAppId;
        uint256 escrowBalance;
        uint256 offerCount;
    }

    bytes32 public constant SIGNED_DEAL_OFFER_TYPEHASH = keccak256(
        "SignedDealOffer(uint256 dealId,address buyer,uint256 amount,uint256 expiry,uint256 nonce)"
    );

    /// @notice Total deals created (1-indexed, shared across deals and MiniApps).
    uint256 public dealCount;
    /// @notice Full deal data keyed by deal ID.
    mapping(uint256 => Deal) public deals;
    /// @notice USDC balance held in escrow for each deal.
    mapping(uint256 => uint256) public dealEscrowBalance;
    /// @notice USDC deposited by each potential buyer per deal (offer system).
    mapping(uint256 => mapping(address => uint256)) public dealOfferDeposits;
    /// @notice Market kind keyed by deal ID.
    mapping(uint256 => DealKind) public dealKinds;
    /// @notice Ordered list of buyer addresses that submitted offers per deal.
    mapping(uint256 => address[]) private _dealOfferBuyers;
    /// @notice Whether a buyer already has an active offer for a deal.
    mapping(uint256 => mapping(address => bool)) private _hasDealOffer;

    // ── MiniApp ────────────────────────────────────────────────

    /// @notice Total MiniApp listings created (1-indexed).
    uint256 public miniAppCount;
    /// @notice Maps MiniApp ID → underlying deal ID.
    mapping(uint256 => uint256) private _miniAppToDeal;
    /// @notice Maps underlying deal ID → MiniApp ID, if any.
    mapping(uint256 => uint256) private _dealToMiniApp;

    // ── Events ──────────────────────────────────────────────────

    /// @notice Emitted when a seller lists a new deal.
    event DealListed(uint256 indexed dealId, address seller, uint256 price, bytes32 metadataHash);
    /// @notice Emitted when a buyer funds a deal at full price.
    event DealFunded(uint256 indexed dealId, address buyer, uint256 amount);
    /// @notice Emitted when the seller marks the deal as delivered.
    event DealDelivered(uint256 indexed dealId);
    /// @notice Emitted when the buyer confirms delivery (seller paid minus fee).
    event DealConfirmed(uint256 indexed dealId, uint256 sellerAmount);
    /// @notice Emitted when either party initiates a dispute (FUNDED or DELIVERED stage).
    event DealDisputed(uint256 indexed dealId);
    /// @notice Emitted when an admin resolves a disputed deal.
    event DealResolved(uint256 indexed dealId, uint256 buyerAmount, uint256 sellerAmount);
    /// @notice Emitted when a buyer claims a refund after the deadline passes.
    event DealRefunded(uint256 indexed dealId);
    /// @notice Emitted when a seller cancels an unfunded deal.
    event DealCancelled(uint256 indexed dealId);
    /// @notice Emitted when the seller extends the FUNDED deadline by 3 days.
    event DealDeadlineExtended(uint256 indexed dealId, uint256 newDeadline);
    /// @notice Emitted when a buyer submits a deal offer.
    event DealOfferSubmitted(uint256 indexed dealId, address buyer, uint256 amount);
    /// @notice Emitted when a buyer withdraws their deal offer.
    event DealOfferWithdrawn(uint256 indexed dealId, address buyer, uint256 amount);
    /// @notice Emitted when the seller accepts a deal offer.
    event DealOfferAccepted(uint256 indexed dealId, address buyer, uint256 amount);
    /// @notice Emitted when the seller accepts a buyer's EIP-712 signed offer.
    event SignedDealOfferAccepted(uint256 indexed dealId, address indexed buyer, uint256 amount, uint256 nonce);
    /// @notice Emitted when a MiniApp is listed.
    event MiniAppListed(uint256 indexed listingId, address seller, uint256 price, bytes32 metadataHash);
    /// @notice Emitted when a MiniApp is purchased instantly.
    event MiniAppSold(uint256 indexed listingId, address buyer, uint256 amount);
    /// @notice Emitted when a MiniApp is cancelled.
    event MiniAppCancelled(uint256 indexed listingId);

    // ── Errors ──────────────────────────────────────────────────

    /// @notice Caller is not the seller or buyer of this deal.
    error NotDealParty();
    /// @notice The deal is not in the stage required for this operation.
    error InvalidDealStage(DealStage current, DealStage expected);

    /// @param _usdc            USDC token address.
    /// @param _platformFeeBps  Initial platform fee in bp (max 500).
    constructor(address _usdc, uint256 _platformFeeBps, address _admin) VaultCore(_usdc, _platformFeeBps, _admin) {}

    /// @notice Reverts unless the deal is in the expected stage.
    modifier atDealStage(uint256 dealId, DealStage expected) {
        if (deals[dealId].stage != expected) revert InvalidDealStage(deals[dealId].stage, expected);
        _;
    }
    /// @notice Restricts execution to the seller of the deal.
    modifier onlySeller(uint256 dealId) {
        if (msg.sender != deals[dealId].seller) revert NotDealParty();
        _;
    }
    /// @notice Restricts execution to the buyer of the deal.
    modifier onlyBuyer(uint256 dealId) {
        if (msg.sender != deals[dealId].buyer) revert NotDealParty();
        _;
    }
    /// @notice Restricts execution to either the seller or buyer of the deal.
    modifier onlyDealParty(uint256 dealId) {
        Deal storage d = deals[dealId];
        if (msg.sender != d.seller && msg.sender != d.buyer) revert NotDealParty();
        _;
    }

    // ────────────────────────────────────────────────────────────
    //  SELLER
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Lists a new deal for sale.
     * @param price         Asking price in USDC (6 decimals).
     * @param metadataHash  Opaque hash of off-chain deal details.
     * @return dealId       The newly created deal ID (1-indexed).
     */
    function listDeal(uint256 price, bytes32 metadataHash) public returns (uint256) {
        return _listDeal(price, metadataHash, DealKind.OTC);
    }

    /// @notice Lists a generic deal with an explicit on-chain market kind.
    function listDealWithKind(uint256 price, bytes32 metadataHash, DealKind kind) external returns (uint256) {
        return _listDeal(price, metadataHash, kind);
    }

    function _listDeal(uint256 price, bytes32 metadataHash, DealKind kind) internal returns (uint256) {
        require(price > 0, "Price > 0");
        dealCount++;
        deals[dealCount] = Deal(msg.sender, address(0), price, metadataHash, 0, block.timestamp, DealStage.LISTED, 0, 0);
        dealKinds[dealCount] = kind;
        _userDealIds[msg.sender].push(dealCount);
        emit DealListed(dealCount, msg.sender, price, metadataHash);
        _recordActivity(
            msg.sender,
            ActivityAction.LISTED,
            _activityMarket(kind),
            dealCount,
            msg.sender,
            address(0),
            price,
            uint8(DealStage.LISTED),
            metadataHash
        );
        return dealCount;
    }

    /**
     * @notice Cancels an unfunded deal and refunds all deal offers.
     * @param dealId The deal to cancel.
     */
    function cancelDeal(uint256 dealId) public onlySeller(dealId) atDealStage(dealId, DealStage.LISTED) {
        _refundDealOffers(dealId);
        Deal storage d = deals[dealId];
        d.stage = DealStage.CANCELLED;
        emit DealCancelled(dealId);
        _recordActivity(
            d.seller,
            ActivityAction.CANCELLED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            address(0),
            d.price,
            uint8(DealStage.CANCELLED),
            d.metadataHash
        );
    }

    /**
     * @notice Updates the price and metadata hash of an unfunded deal.
     * @param dealId          The deal to update.
     * @param newPrice        New asking price.
     * @param newMetadataHash New metadata hash.
     */
    function updateDeal(uint256 dealId, uint256 newPrice, bytes32 newMetadataHash)
        public onlySeller(dealId) atDealStage(dealId, DealStage.LISTED)
    {
        require(newPrice > 0, "Price > 0");
        deals[dealId].price = newPrice;
        deals[dealId].metadataHash = newMetadataHash;
        _recordActivity(
            deals[dealId].seller,
            ActivityAction.UPDATED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            address(0),
            newPrice,
            uint8(DealStage.LISTED),
            newMetadataHash
        );
    }

    /**
     * @notice Marks the deal as delivered, starting the 3-day buyer review window.
     * @param dealId The deal to mark.
     */
    function markDelivered(uint256 dealId) public onlySeller(dealId) atDealStage(dealId, DealStage.FUNDED) {
        Deal storage d = deals[dealId]; require(block.timestamp < d.deadline, "Deadline passed");
        d.stage = DealStage.DELIVERED; d.deadline = block.timestamp + 3 days;
        emit DealDelivered(dealId);
        _recordActivityForPair(
            d.seller,
            d.buyer,
            ActivityAction.DELIVERED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            d.buyer,
            d.price,
            uint8(DealStage.DELIVERED),
            d.metadataHash
        );
    }

    /**
     * @notice Extends the funding deadline by 3 days, up to a maximum of
     *         14 days from creation.
     * @param dealId The deal to extend.
     */
    function extendDeadline(uint256 dealId) public onlySeller(dealId) atDealStage(dealId, DealStage.FUNDED) {
        Deal storage d = deals[dealId];
        uint256 maxDeadline = d.createdAt + 14 days;
        uint256 newDeadline = d.deadline + 3 days;
        require(newDeadline <= maxDeadline, "Cannot extend beyond 14 days");
        d.deadline = newDeadline;
        emit DealDeadlineExtended(dealId, newDeadline);
        _recordActivityForPair(
            d.seller,
            d.buyer,
            ActivityAction.DEADLINE_EXTENDED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            d.buyer,
            d.price,
            uint8(DealStage.FUNDED),
            d.metadataHash
        );
    }

    // ────────────────────────────────────────────────────────────
    //  BUYER
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Funds a deal at the full listing price, becoming the buyer.
     * @param dealId The deal to fund.
     * @param amount Must equal the listing price.
     */
    function fundDeal(uint256 dealId, uint256 amount)
        public nonReentrant whenNotPaused atDealStage(dealId, DealStage.LISTED)
    {
        Deal storage d = deals[dealId];
        require(msg.sender != d.seller, "Seller cannot buy own listing");
        require(amount == d.price, "Amount must equal listing price");
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        d.buyer = msg.sender; d.stage = DealStage.FUNDED; d.deadline = block.timestamp + 7 days;
        dealEscrowBalance[dealId] = amount;
        _userBoughtDealIds[msg.sender].push(dealId);
        _increaseLocked(msg.sender, amount);
        _increaseActiveDeal(d.seller, msg.sender);
        emit DealFunded(dealId, msg.sender, amount);
        _recordActivityForPair(
            d.seller,
            msg.sender,
            ActivityAction.FUNDED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            d.seller,
            amount,
            uint8(DealStage.FUNDED),
            d.metadataHash
        );
    }

    /**
     * @notice Submits a deal offer at any amount. The seller can later accept.
     * @param dealId The deal to offer on.
     * @param amount USDC amount to deposit.
     * @dev Each buyer can only have one active offer per deal.
     */
    function submitDealOffer(uint256 dealId, uint256 amount)
        external whenNotPaused atDealStage(dealId, DealStage.LISTED)
    {
        require(amount > 0, "Amount must be > 0");
        require(msg.sender != deals[dealId].seller, "Seller cannot offer on own listing");
        if (_hasDealOffer[dealId][msg.sender]) revert AlreadyOffered();
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        dealOfferDeposits[dealId][msg.sender] = amount;
        _dealOfferBuyers[dealId].push(msg.sender);
        _hasDealOffer[dealId][msg.sender] = true;
        _userDealOfferIds[msg.sender].push(dealId);
        _increaseLocked(msg.sender, amount);
        emit DealOfferSubmitted(dealId, msg.sender, amount);
        _recordActivityForPair(
            msg.sender,
            deals[dealId].seller,
            ActivityAction.OFFER_SUBMITTED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            deals[dealId].seller,
            amount,
            uint8(DealStage.LISTED),
            deals[dealId].metadataHash
        );
    }

    /**
     * @notice Withdraws a previously submitted deal offer.
     * @param dealId The deal to withdraw from.
     */
    function withdrawDealOffer(uint256 dealId) external {
        uint256 deposited = dealOfferDeposits[dealId][msg.sender];
        require(deposited > 0, "No deposit");
        dealOfferDeposits[dealId][msg.sender] = 0;
        _hasDealOffer[dealId][msg.sender] = false;
        _decreaseLocked(msg.sender, deposited);
        if (!usdc.transfer(msg.sender, deposited)) revert TransferFailed();
        emit DealOfferWithdrawn(dealId, msg.sender, deposited);
        _recordActivityForPair(
            msg.sender,
            deals[dealId].seller,
            ActivityAction.OFFER_WITHDRAWN,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            deals[dealId].seller,
            deposited,
            uint8(deals[dealId].stage),
            deals[dealId].metadataHash
        );
    }

    /**
     * @notice Seller accepts a specific buyer's deal offer, funding the deal.
     * @param dealId The deal.
     * @param buyer  Address of the buyer whose offer to accept.
     * @dev All other deal offers are automatically refunded.
     */
    function acceptDealOffer(uint256 dealId, address buyer)
        external nonReentrant onlySeller(dealId) atDealStage(dealId, DealStage.LISTED)
    {
        uint256 deposited = dealOfferDeposits[dealId][buyer];
        require(deposited > 0, "No deposit");
        Deal storage d = deals[dealId];
        d.buyer = buyer; d.price = deposited; d.stage = DealStage.FUNDED; d.deadline = block.timestamp + 7 days;
        dealEscrowBalance[dealId] = deposited;
        dealOfferDeposits[dealId][buyer] = 0;
        _hasDealOffer[dealId][buyer] = false;
        _userBoughtDealIds[buyer].push(dealId);
        _increaseActiveDeal(d.seller, buyer);
        _refundDealOffersExcept(dealId, buyer);
        emit DealOfferAccepted(dealId, buyer, deposited);
        emit DealFunded(dealId, buyer, deposited);
        _recordActivityForPair(
            d.seller,
            buyer,
            ActivityAction.OFFER_ACCEPTED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            buyer,
            deposited,
            uint8(DealStage.FUNDED),
            d.metadataHash
        );
    }

    /**
     * @notice Accepts a buyer's EIP-712 signed offer, pulling USDC into escrow.
     * @dev Funds remain escrowed; seller is paid only after buyer confirms delivery.
     * @param offer     Signed deal offer terms.
     * @param signature Buyer signature over the offer.
     */
    function acceptSignedDealOffer(SignedDealOffer calldata offer, bytes calldata signature)
        external nonReentrant whenNotPaused onlySeller(offer.dealId) atDealStage(offer.dealId, DealStage.LISTED)
    {
        require(offer.amount > 0, "Amount must be > 0");
        Deal storage d = deals[offer.dealId];
        require(offer.buyer != d.seller, "Seller cannot buy own listing");
        bytes32 structHash = keccak256(
            abi.encode(
                SIGNED_DEAL_OFFER_TYPEHASH,
                offer.dealId,
                offer.buyer,
                offer.amount,
                offer.expiry,
                offer.nonce
            )
        );
        address signer = _recoverSigner(_hashTypedData("VaultDeals", structHash), signature);
        if (signer != offer.buyer) revert InvalidSignature();
        _consumeOfferNonce(offer.buyer, offer.nonce, offer.expiry);

        if (!usdc.transferFrom(offer.buyer, address(this), offer.amount)) revert TransferFailed();
        d.buyer = offer.buyer;
        d.price = offer.amount;
        d.stage = DealStage.FUNDED;
        d.deadline = block.timestamp + 7 days;
        dealEscrowBalance[offer.dealId] = offer.amount;
        _userBoughtDealIds[offer.buyer].push(offer.dealId);
        _increaseLocked(offer.buyer, offer.amount);
        _increaseActiveDeal(d.seller, offer.buyer);
        _refundDealOffers(offer.dealId);
        emit DealOfferAccepted(offer.dealId, offer.buyer, offer.amount);
        emit DealFunded(offer.dealId, offer.buyer, offer.amount);
        emit SignedDealOfferAccepted(offer.dealId, offer.buyer, offer.amount, offer.nonce);
        _recordActivityForPair(
            d.seller,
            offer.buyer,
            ActivityAction.OFFER_ACCEPTED,
            _activityMarket(dealKinds[offer.dealId]),
            offer.dealId,
            msg.sender,
            offer.buyer,
            offer.amount,
            uint8(DealStage.FUNDED),
            d.metadataHash
        );
    }

    /**
     * @notice Buyer confirms delivery. Seller receives payment minus platform fee.
     * @param dealId The deal to confirm.
     */
    function confirmDelivery(uint256 dealId)
        public nonReentrant whenNotPaused onlyBuyer(dealId) atDealStage(dealId, DealStage.DELIVERED)
    {
        Deal storage d = deals[dealId];
        uint256 fee = (d.price * platformFeeBps) / 10000;
        d.stage = DealStage.CONFIRMED; dealEscrowBalance[dealId] = 0;
        _decreaseLocked(d.buyer, d.price);
        _decreaseActiveDeal(d.seller, d.buyer);
        _increaseLifetimeVolume(d.seller, d.buyer, d.price);
        if (!usdc.transfer(d.seller, d.price - fee)) revert TransferFailed();
        if (fee > 0 && !usdc.transfer(treasury, fee)) revert TransferFailed();
        emit DealConfirmed(dealId, d.price - fee);
        _recordActivityForPair(
            d.seller,
            d.buyer,
            ActivityAction.CONFIRMED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            d.seller,
            d.price,
            uint8(DealStage.CONFIRMED),
            d.metadataHash
        );
    }

    /**
     * @notice Buyer claims a full refund after the funding deadline expires.
     * @param dealId The deal to refund.
     */
    function refundDeal(uint256 dealId) public onlyBuyer(dealId) atDealStage(dealId, DealStage.FUNDED) {
        require(block.timestamp > deals[dealId].deadline, "Deadline not passed");
        Deal storage d = deals[dealId];
        uint256 amount = dealEscrowBalance[dealId]; dealEscrowBalance[dealId] = 0;
        d.stage = DealStage.REFUNDED;
        _decreaseLocked(d.buyer, amount);
        _decreaseActiveDeal(d.seller, d.buyer);
        if (!usdc.transfer(d.buyer, amount)) revert TransferFailed();
        emit DealRefunded(dealId);
        _recordActivityForPair(
            d.seller,
            d.buyer,
            ActivityAction.REFUNDED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            d.seller,
            amount,
            uint8(DealStage.REFUNDED),
            d.metadataHash
        );
    }

    /**
     * @notice Either party can dispute a deal at FUNDED or DELIVERED stage.
     * @param dealId The deal to dispute.
     * @dev Moves the deal to DISPUTED; only an admin can resolve from there.
     */
    function disputeDeal(uint256 dealId) public onlyDealParty(dealId) {
        DealStage s = deals[dealId].stage;
        if (s != DealStage.FUNDED && s != DealStage.DELIVERED) revert InvalidDealStage(s, DealStage.DELIVERED);
        Deal storage d = deals[dealId];
        d.stage = DealStage.DISPUTED;
        emit DealDisputed(dealId);
        _recordActivityForPair(
            d.seller,
            d.buyer,
            ActivityAction.DISPUTED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            msg.sender == d.seller ? d.buyer : d.seller,
            d.price,
            uint8(DealStage.DISPUTED),
            d.metadataHash
        );
    }

    /**
     * @notice Admin resolves a disputed deal by splitting the escrowed funds.
     * @param dealId       The disputed deal.
     * @param buyerAmount  USDC awarded to buyer.
     * @param sellerAmount USDC awarded to seller (platform fee deducted).
     * @dev Any remaining dust is sent to treasury. Sum must not exceed escrow balance.
     */
    function resolveDeal(uint256 dealId, uint256 buyerAmount, uint256 sellerAmount)
        public onlyAdmin nonReentrant atDealStage(dealId, DealStage.DISPUTED)
    {
        Deal storage d = deals[dealId]; uint256 bal = dealEscrowBalance[dealId];
        require(buyerAmount + sellerAmount <= bal, "Exceed escrow");
        d.stage = DealStage.RESOLVED; d.buyerAmount = buyerAmount; d.sellerAmount = sellerAmount; dealEscrowBalance[dealId] = 0;
        _decreaseLocked(d.buyer, bal);
        _decreaseActiveDeal(d.seller, d.buyer);
        _increaseLifetimeVolume(d.seller, d.buyer, sellerAmount);
        if (buyerAmount > 0 && !usdc.transfer(d.buyer, buyerAmount)) revert TransferFailed();
        if (sellerAmount > 0) {
            uint256 fee = (sellerAmount * platformFeeBps) / 10000;
            if (!usdc.transfer(d.seller, sellerAmount - fee)) revert TransferFailed();
            if (fee > 0 && !usdc.transfer(treasury, fee)) revert TransferFailed();
        }
        uint256 dust = bal - buyerAmount - sellerAmount;
        if (dust > 0 && !usdc.transfer(treasury, dust)) revert TransferFailed();
        emit DealResolved(dealId, buyerAmount, sellerAmount);
        _recordActivityForPair(
            d.seller,
            d.buyer,
            ActivityAction.RESOLVED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            d.seller,
            sellerAmount,
            uint8(DealStage.RESOLVED),
            d.metadataHash
        );
        _recordActivity(
            msg.sender,
            ActivityAction.RESOLVED,
            _activityMarket(dealKinds[dealId]),
            dealId,
            msg.sender,
            d.seller,
            sellerAmount,
            uint8(DealStage.RESOLVED),
            d.metadataHash
        );
    }

    // ────────────────────────────────────────────────────────────
    //  MINI APP
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Lists a MiniApp (convenience wrapper around listDeal).
     * @param price         Asking price in USDC.
     * @param metadataHash  Opaque hash.
     * @return miniAppId    The newly created MiniApp ID (1-indexed).
     */
    function listMiniApp(uint256 price, bytes32 metadataHash) external returns (uint256) {
        uint256 dealId = _listDeal(price, metadataHash, DealKind.MINI_APP);
        miniAppCount++; _miniAppToDeal[miniAppCount] = dealId; _dealToMiniApp[dealId] = miniAppCount;
        emit MiniAppListed(miniAppCount, msg.sender, price, metadataHash);
        return miniAppCount;
    }

    /**
     * @notice Cancels a MiniApp listing.
     * @param miniAppId The MiniApp to cancel.
     */
    function cancelMiniApp(uint256 miniAppId) external {
        uint256 dealId = _miniAppToDeal[miniAppId]; require(dealId > 0, "Not found");
        cancelDeal(dealId); emit MiniAppCancelled(miniAppId);
    }

    /**
     * @notice Updates a MiniApp's price and metadata hash.
     * @param miniAppId       The MiniApp to update.
     * @param newPrice        New asking price.
     * @param newMetadataHash New metadata hash.
     */
    function updateMiniApp(uint256 miniAppId, uint256 newPrice, bytes32 newMetadataHash) external {
        uint256 dealId = _miniAppToDeal[miniAppId]; require(dealId > 0, "Not found");
        updateDeal(dealId, newPrice, newMetadataHash);
    }

    /**
     * @notice Instantly purchases a MiniApp at full listing price.
     * @param miniAppId The MiniApp to purchase.
     * @param amount    Must equal the listing price.
     */
    function buyMiniApp(uint256 miniAppId, uint256 amount) external whenNotPaused {
        uint256 dealId = _miniAppToDeal[miniAppId]; require(dealId > 0, "Not found");
        Deal storage d = deals[dealId];
        require(d.stage == DealStage.LISTED, "Not available");
        require(msg.sender != d.seller, "Seller cannot buy own listing");
        require(amount == d.price, "Amount must equal listing price");
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        d.buyer = msg.sender; d.stage = DealStage.FUNDED; d.deadline = block.timestamp + 7 days;
        dealEscrowBalance[dealId] = amount;
        _userBoughtDealIds[msg.sender].push(dealId);
        _increaseLocked(msg.sender, amount);
        _increaseActiveDeal(d.seller, msg.sender);
        emit DealFunded(dealId, msg.sender, amount);
        emit MiniAppSold(miniAppId, msg.sender, amount);
        _recordActivityForPair(
            d.seller,
            msg.sender,
            ActivityAction.FUNDED,
            ActivityMarket.MINI_APP,
            dealId,
            msg.sender,
            d.seller,
            amount,
            uint8(DealStage.FUNDED),
            d.metadataHash
        );
    }

    // ────────────────────────────────────────────────────────────
    //  HELPERS
    // ────────────────────────────────────────────────────────────

    /**
     * @notice Refunds all deal offers for a given deal.
     * @param dealId The deal whose offers to refund.
     * @dev Always clears the buyers array.
     */
    function _refundDealOffers(uint256 dealId) private {
        address[] storage offerers = _dealOfferBuyers[dealId];
        for (uint256 i = 0; i < offerers.length; i++) {
            address b = offerers[i]; uint256 d = dealOfferDeposits[dealId][b];
            if (d > 0) {
                dealOfferDeposits[dealId][b] = 0; _hasDealOffer[dealId][b] = false;
                _decreaseLocked(b, d);
                if (!usdc.transfer(b, d)) revert TransferFailed();
                emit DealOfferWithdrawn(dealId, b, d);
                _recordActivityForPair(
                    b,
                    deals[dealId].seller,
                    ActivityAction.OFFER_WITHDRAWN,
                    _activityMarket(dealKinds[dealId]),
                    dealId,
                    address(this),
                    deals[dealId].seller,
                    d,
                    uint8(deals[dealId].stage),
                    deals[dealId].metadataHash
                );
            }
        }
        delete _dealOfferBuyers[dealId];
    }

    /**
     * @notice Refunds all deal offers except the accepted buyer's.
     * @param dealId The deal.
     * @param skip   Buyer address to skip (the one being accepted).
     */
    function _refundDealOffersExcept(uint256 dealId, address skip) private {
        address[] storage offerers = _dealOfferBuyers[dealId];
        for (uint256 i = 0; i < offerers.length; i++) {
            address b = offerers[i]; if (b == skip) continue;
            uint256 d = dealOfferDeposits[dealId][b];
            if (d > 0) {
                dealOfferDeposits[dealId][b] = 0; _hasDealOffer[dealId][b] = false;
                _decreaseLocked(b, d);
                if (!usdc.transfer(b, d)) revert TransferFailed();
                emit DealOfferWithdrawn(dealId, b, d);
                _recordActivityForPair(
                    b,
                    deals[dealId].seller,
                    ActivityAction.OFFER_WITHDRAWN,
                    _activityMarket(dealKinds[dealId]),
                    dealId,
                    address(this),
                    deals[dealId].seller,
                    d,
                    uint8(deals[dealId].stage),
                    deals[dealId].metadataHash
                );
            }
        }
        delete _dealOfferBuyers[dealId];
    }

    /// @notice Returns the number of active deal offers for a deal.
    function getDealOfferCount(uint256 dealId) external view returns (uint256) { return _dealOfferBuyers[dealId].length; }
    /// @notice Returns all buyer addresses with active deal offers for a deal.
    function getDealOfferBuyers(uint256 dealId) external view returns (address[] memory) { return _dealOfferBuyers[dealId]; }
    /// @notice Returns a single deal summary for detail views.
    function getDealSummary(uint256 dealId) public view returns (DealSummary memory) {
        return DealSummary({
            id: dealId,
            deal: deals[dealId],
            kind: dealKinds[dealId],
            miniAppId: _dealToMiniApp[dealId],
            escrowBalance: dealEscrowBalance[dealId],
            offerCount: _dealOfferBuyers[dealId].length
        });
    }

    /// @notice Returns deal summaries from startId, inclusive, ascending.
    function getDeals(uint256 startId, uint256 limit) external view returns (DealSummary[] memory) {
        if (startId == 0 || startId > dealCount || limit == 0) return new DealSummary[](0);
        uint256 count = dealCount - startId + 1;
        if (count > limit) count = limit;
        DealSummary[] memory page = new DealSummary[](count);
        for (uint256 i = 0; i < count; i++) {
            page[i] = getDealSummary(startId + i);
        }
        return page;
    }

    /// @notice Returns the underlying deal summary for a MiniApp ID.
    function getMiniAppDeal(uint256 miniAppId) external view returns (DealSummary memory) {
        uint256 dealId = _miniAppToDeal[miniAppId];
        require(dealId > 0, "Not found");
        return getDealSummary(dealId);
    }

    /// @notice Returns an active offer deposit for a buyer.
    function getDealOffer(uint256 dealId, address buyer) external view returns (uint256 deposit, bool active) {
        return (dealOfferDeposits[dealId][buyer], _hasDealOffer[dealId][buyer]);
    }

    function _activityMarket(DealKind kind) private pure returns (ActivityMarket) {
        if (kind == DealKind.MINI_APP) return ActivityMarket.MINI_APP;
        if (kind == DealKind.X_ACCOUNT) return ActivityMarket.X_ACCOUNT;
        if (kind == DealKind.FARCASTER) return ActivityMarket.FARCASTER;
        if (kind == DealKind.CLANKER) return ActivityMarket.CLANKER;
        if (kind == DealKind.BUNDLE) return ActivityMarket.BUNDLE;
        return ActivityMarket.OTC;
    }
}
