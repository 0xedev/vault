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

    /// @notice Total deals created (1-indexed, shared across deals and MiniApps).
    uint256 public dealCount;
    /// @notice Full deal data keyed by deal ID.
    mapping(uint256 => Deal) public deals;
    /// @notice USDC balance held in escrow for each deal.
    mapping(uint256 => uint256) public dealEscrowBalance;
    /// @notice USDC deposited by each potential buyer per deal (offer system).
    mapping(uint256 => mapping(address => uint256)) public dealOfferDeposits;
    /// @notice Ordered list of buyer addresses that submitted offers per deal.
    mapping(uint256 => address[]) private _dealOfferBuyers;
    /// @notice Whether a buyer already has an active offer for a deal.
    mapping(uint256 => mapping(address => bool)) private _hasDealOffer;

    // ── MiniApp ────────────────────────────────────────────────

    /// @notice Total MiniApp listings created (1-indexed).
    uint256 public miniAppCount;
    /// @notice Maps MiniApp ID → underlying deal ID.
    mapping(uint256 => uint256) private _miniAppToDeal;

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
    constructor(address _usdc, uint256 _platformFeeBps) VaultCore(_usdc, _platformFeeBps) {}

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
        require(price > 0, "Price > 0");
        dealCount++;
        deals[dealCount] = Deal(msg.sender, address(0), price, metadataHash, 0, block.timestamp, DealStage.LISTED, 0, 0);
        emit DealListed(dealCount, msg.sender, price, metadataHash);
        return dealCount;
    }

    /**
     * @notice Cancels an unfunded deal and refunds all deal offers.
     * @param dealId The deal to cancel.
     */
    function cancelDeal(uint256 dealId) public onlySeller(dealId) atDealStage(dealId, DealStage.LISTED) {
        _refundDealOffers(dealId);
        deals[dealId].stage = DealStage.CANCELLED;
        emit DealCancelled(dealId);
    }

    /**
     * @notice Updates the price and metadata hash of an unfunded deal.
     * @param dealId          The deal to update.
     * @param newPrice        New asking price.
     * @param newMetadataHash New metadata hash.
     */
    function updateDeal(uint256 dealId, uint256 newPrice, bytes32 newMetadataHash)
        public onlySeller(dealId) atDealStage(dealId, DealStage.LISTED)
    { require(newPrice > 0, "Price > 0"); deals[dealId].price = newPrice; deals[dealId].metadataHash = newMetadataHash; }

    /**
     * @notice Marks the deal as delivered, starting the 3-day buyer review window.
     * @param dealId The deal to mark.
     */
    function markDelivered(uint256 dealId) public onlySeller(dealId) atDealStage(dealId, DealStage.FUNDED) {
        Deal storage d = deals[dealId]; require(block.timestamp < d.deadline, "Deadline passed");
        d.stage = DealStage.DELIVERED; d.deadline = block.timestamp + 3 days;
        emit DealDelivered(dealId);
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
        emit DealFunded(dealId, msg.sender, amount);
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
        emit DealOfferSubmitted(dealId, msg.sender, amount);
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
        if (!usdc.transfer(msg.sender, deposited)) revert TransferFailed();
        emit DealOfferWithdrawn(dealId, msg.sender, deposited);
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
        _refundDealOffersExcept(dealId, buyer);
        emit DealOfferAccepted(dealId, buyer, deposited);
        emit DealFunded(dealId, buyer, deposited);
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
        if (!usdc.transfer(d.seller, d.price - fee)) revert TransferFailed();
        if (fee > 0 && !usdc.transfer(treasury, fee)) revert TransferFailed();
        emit DealConfirmed(dealId, d.price - fee);
    }

    /**
     * @notice Buyer claims a full refund after the funding deadline expires.
     * @param dealId The deal to refund.
     */
    function refundDeal(uint256 dealId) public onlyBuyer(dealId) atDealStage(dealId, DealStage.FUNDED) {
        require(block.timestamp > deals[dealId].deadline, "Deadline not passed");
        uint256 amount = dealEscrowBalance[dealId]; dealEscrowBalance[dealId] = 0;
        deals[dealId].stage = DealStage.REFUNDED;
        if (!usdc.transfer(deals[dealId].buyer, amount)) revert TransferFailed();
        emit DealRefunded(dealId);
    }

    /**
     * @notice Either party can dispute a deal at FUNDED or DELIVERED stage.
     * @param dealId The deal to dispute.
     * @dev Moves the deal to DISPUTED; only an admin can resolve from there.
     */
    function disputeDeal(uint256 dealId) public onlyDealParty(dealId) {
        DealStage s = deals[dealId].stage;
        if (s != DealStage.FUNDED && s != DealStage.DELIVERED) revert InvalidDealStage(s, DealStage.DELIVERED);
        deals[dealId].stage = DealStage.DISPUTED;
        emit DealDisputed(dealId);
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
        if (buyerAmount > 0 && !usdc.transfer(d.buyer, buyerAmount)) revert TransferFailed();
        if (sellerAmount > 0) {
            uint256 fee = (sellerAmount * platformFeeBps) / 10000;
            if (!usdc.transfer(d.seller, sellerAmount - fee)) revert TransferFailed();
            if (fee > 0 && !usdc.transfer(treasury, fee)) revert TransferFailed();
        }
        uint256 dust = bal - buyerAmount - sellerAmount;
        if (dust > 0 && !usdc.transfer(treasury, dust)) revert TransferFailed();
        emit DealResolved(dealId, buyerAmount, sellerAmount);
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
        uint256 dealId = listDeal(price, metadataHash);
        miniAppCount++; _miniAppToDeal[miniAppCount] = dealId;
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
        emit DealFunded(dealId, msg.sender, amount);
        emit MiniAppSold(miniAppId, msg.sender, amount);
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
                if (!usdc.transfer(b, d)) revert TransferFailed();
                emit DealOfferWithdrawn(dealId, b, d);
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
                if (!usdc.transfer(b, d)) revert TransferFailed();
                emit DealOfferWithdrawn(dealId, b, d);
            }
        }
        delete _dealOfferBuyers[dealId];
    }

    /// @notice Returns the number of active deal offers for a deal.
    function getDealOfferCount(uint256 dealId) external view returns (uint256) { return _dealOfferBuyers[dealId].length; }
    /// @notice Returns all buyer addresses with active deal offers for a deal.
    function getDealOfferBuyers(uint256 dealId) external view returns (address[] memory) { return _dealOfferBuyers[dealId]; }
}
