// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VaultCore
 * @notice Shared base for VaultNFT and VaultDeals.
 *         Provides multi-admin access control, USDC reference, treasury,
 *         platform fee (basis points, max 5%), emergency pause, and a
 *         non-reentrant guard consumed by both child contracts.
 */
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract VaultCore {
    /// @notice Compact activity action codes used by both child contracts.
    enum ActivityAction {
        LISTED,
        UPDATED,
        CANCELLED,
        OFFER_SUBMITTED,
        OFFER_UPDATED,
        OFFER_WITHDRAWN,
        OFFER_ACCEPTED,
        FUNDED,
        DELIVERED,
        CONFIRMED,
        REPAID,
        DEFAULT_CLAIMED,
        DISPUTED,
        RESOLVED,
        REFUNDED,
        DEADLINE_EXTENDED
    }

    /// @notice Compact market codes. UI labels stay off-chain.
    enum ActivityMarket { NFT_LOAN, MINI_APP, X_ACCOUNT, FARCASTER, CLANKER, BUNDLE, OTC }

    /// @notice Per-user compact activity entry. No strings are stored on-chain.
    struct Activity {
        uint8 action;
        uint8 market;
        uint256 subjectId;
        address actor;
        address counterparty;
        uint256 amount;
        uint256 timestamp;
        uint8 status;
        bytes32 metadataHash;
    }

    /// @notice Aggregated profile counters for direct contract reads.
    struct ProfileCounters {
        uint256 nftListingCount;
        uint256 dealListingCount;
        uint256 boughtDealCount;
        uint256 loanOfferCount;
        uint256 dealOfferCount;
        uint256 lockedUSDC;
        uint256 activeLoanCount;
        uint256 activeDealCount;
        uint256 lifetimeVolume;
        uint256 activityCount;
    }

    struct ProfileStats {
        uint256 lockedUSDC;
        uint256 activeLoanCount;
        uint256 activeDealCount;
        uint256 lifetimeVolume;
    }

    /// @notice The USDC (or USDC-like 6-decimal) token used for all value transfers.
    IERC20 public immutable usdc;

    /// @notice Platform fee in basis points (1 bp = 0.01%). Capped at 500 (5%).
    uint256 public platformFeeBps;

    /// @notice Emergency pause flag shared across both escrow systems.
    bool public paused;

    /// @notice Simple reentrancy lock (nonReentrant modifier flips this bool).
    bool private _entered;

    /// @notice Multi-admin membership. Any admin can add/remove others.
    mapping(address => bool) public admins;

    /// @notice Per-signer offer nonces that have been consumed or cancelled.
    mapping(address => mapping(uint256 => bool)) public usedOrCancelledOfferNonces;

    mapping(address => Activity[]) private _userActivities;
    mapping(address => ProfileStats) internal _profileStats;
    mapping(address => uint256[]) internal _userNftListingIds;
    mapping(address => uint256[]) internal _userDealIds;
    mapping(address => uint256[]) internal _userBoughtDealIds;
    mapping(address => uint256[]) internal _userLoanOfferListingIds;
    mapping(address => uint256[]) internal _userDealOfferIds;

    /// @notice Number of active admins (must stay >= 1).
    uint256 public adminCount;

    /// @notice Address that receives platform fees on every value transfer.
    address public treasury;

    // ── Events ──────────────────────────────────────────────────

    /// @notice Emitted when the platform fee basis points are changed.
    event PlatformFeeUpdated(uint256 newFee);

    /// @notice Emitted when an address is granted admin privileges.
    event AdminAdded(address indexed admin);

    /// @notice Emitted when an admin is removed.
    event AdminRemoved(address indexed admin);

    /// @notice Emitted when the treasury address is changed.
    event TreasurySet(address indexed oldTreasury, address indexed newTreasury);

    /// @notice Emitted when the contract is paused.
    event Paused();

    /// @notice Emitted when the contract is unpaused.
    event Unpaused();

    /// @notice Emitted when a signer invalidates an offer nonce.
    event OfferNonceCancelled(address indexed signer, uint256 indexed nonce);

    /// @notice Emitted whenever compact activity is appended for a profile.
    event UserActivityRecorded(
        address indexed user,
        uint256 indexed activityId,
        uint8 action,
        uint8 market,
        uint256 indexed subjectId,
        address actor,
        address counterparty,
        uint256 amount,
        uint256 timestamp,
        uint8 status,
        bytes32 metadataHash
    );

    // ── Errors ──────────────────────────────────────────────────

    /// @notice Caller does not have admin privileges.
    error NotAdmin();

    /// @notice A USDC transfer or transferFrom returned false.
    error TransferFailed();

    /// @notice The function is blocked while the contract is paused.
    error ContractPaused();

    /// @notice The caller already has an active offer for this listing/deal.
    error AlreadyOffered();

    /// @notice EIP-712 signature is invalid.
    error InvalidSignature();

    /// @notice Signed offer has expired.
    error OfferExpired();

    /// @notice Signed offer nonce was already used or cancelled.
    error OfferNonceUnavailable();

    // ── Modifiers ───────────────────────────────────────────────

    /// @notice Restricts execution to admin addresses.
    modifier onlyAdmin() {
        if (!admins[msg.sender]) revert NotAdmin();
        _;
    }

    /// @notice Simple boolean reentrancy guard.
    modifier nonReentrant() {
        require(!_entered, "Reentrant call");
        _entered = true;
        _;
        _entered = false;
    }

    /// @notice Reverts if the contract is paused.
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    /**
     * @param _usdc            Address of the USDC token.
     * @param _platformFeeBps  Initial platform fee in bp (max 500).
     * @param _admin           First admin and treasury recipient.
     */
    constructor(address _usdc, uint256 _platformFeeBps, address _admin) {
        require(_admin != address(0), "Invalid admin");
        admins[_admin] = true;
        adminCount = 1;
        treasury = _admin;
        usdc = IERC20(_usdc);
        platformFeeBps = _platformFeeBps;
    }

    // ── Admin functions ─────────────────────────────────────────

    /**
     * @notice Grants admin privileges to `newAdmin`.
     * @param newAdmin Address to promote.
     */
    function addAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        if (!admins[newAdmin]) adminCount++;
        admins[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }

    /**
     * @notice Revokes admin privileges from `target`.
     * @param target Address to demote.
     * @dev Cannot remove the last admin, and an admin cannot self-remove
     *      if they are the sole admin.
     */
    function removeAdmin(address target) external onlyAdmin {
        require(admins[target], "Not an admin");
        require(adminCount > 1 || msg.sender != target, "Cannot remove last admin");
        admins[target] = false;
        adminCount--;
        emit AdminRemoved(target);
    }

    /**
     * @notice Sets the address that receives platform fees.
     * @param newTreasury Non-zero address.
     */
    function setTreasury(address newTreasury) external onlyAdmin {
        require(newTreasury != address(0), "Invalid address");
        address old = treasury;
        treasury = newTreasury;
        emit TreasurySet(old, newTreasury);
    }

    /**
     * @notice Updates the platform fee.
     * @param newFeeBps Fee in basis points (max 500 = 5%).
     */
    function setPlatformFee(uint256 newFeeBps) external onlyAdmin {
        require(newFeeBps <= 500, "Max 5%");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    /// @notice Activates the emergency pause. All state-changing
    ///         operations guarded by `whenNotPaused` will revert.
    function pause() external onlyAdmin {
        paused = true;
        emit Paused();
    }

    /// @notice Deactivates the emergency pause.
    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused();
    }

    // ── Signed offers ───────────────────────────────────────────

    /**
     * @notice Cancels a signed offer nonce for the caller.
     * @param nonce Offer nonce to invalidate.
     */
    function cancelOfferNonce(uint256 nonce) external {
        usedOrCancelledOfferNonces[msg.sender][nonce] = true;
        emit OfferNonceCancelled(msg.sender, nonce);
    }

    /**
     * @notice Cancels multiple signed offer nonces for the caller.
     * @param nonces Offer nonces to invalidate.
     */
    function cancelOfferNonces(uint256[] calldata nonces) external {
        for (uint256 i = 0; i < nonces.length; i++) {
            usedOrCancelledOfferNonces[msg.sender][nonces[i]] = true;
            emit OfferNonceCancelled(msg.sender, nonces[i]);
        }
    }

    function _hashTypedData(string memory name, bytes32 structHash) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _recoverSigner(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert InvalidSignature();
        if (uint256(s) > 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0) revert InvalidSignature();
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
        return signer;
    }

    function _consumeOfferNonce(address signer, uint256 nonce, uint256 expiry) internal {
        if (block.timestamp > expiry) revert OfferExpired();
        if (usedOrCancelledOfferNonces[signer][nonce]) revert OfferNonceUnavailable();
        usedOrCancelledOfferNonces[signer][nonce] = true;
    }

    // ── Profile reads ───────────────────────────────────────────

    function getUserProfile(address user) external view returns (ProfileCounters memory profile) {
        ProfileStats storage stats = _profileStats[user];
        profile = ProfileCounters({
            nftListingCount: _userNftListingIds[user].length,
            dealListingCount: _userDealIds[user].length,
            boughtDealCount: _userBoughtDealIds[user].length,
            loanOfferCount: _userLoanOfferListingIds[user].length,
            dealOfferCount: _userDealOfferIds[user].length,
            lockedUSDC: stats.lockedUSDC,
            activeLoanCount: stats.activeLoanCount,
            activeDealCount: stats.activeDealCount,
            lifetimeVolume: stats.lifetimeVolume,
            activityCount: _userActivities[user].length
        });
    }

    function getUserActivities(address user, uint256 offset, uint256 limit) external view returns (Activity[] memory) {
        uint256 total = _userActivities[user].length;
        if (offset >= total || limit == 0) return new Activity[](0);
        uint256 count = total - offset;
        if (count > limit) count = limit;
        Activity[] memory page = new Activity[](count);
        for (uint256 i = 0; i < count; i++) {
            page[i] = _userActivities[user][total - 1 - offset - i];
        }
        return page;
    }

    function getUserNftListingIds(address user, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _sliceNewest(_userNftListingIds[user], offset, limit);
    }

    function getUserDealIds(address user, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _sliceNewest(_userDealIds[user], offset, limit);
    }

    function getUserBoughtDealIds(address user, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _sliceNewest(_userBoughtDealIds[user], offset, limit);
    }

    function getUserLoanOfferListingIds(address user, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _sliceNewest(_userLoanOfferListingIds[user], offset, limit);
    }

    function getUserDealOfferIds(address user, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        return _sliceNewest(_userDealOfferIds[user], offset, limit);
    }

    function isAdmin(address user) external view returns (bool) {
        return admins[user];
    }

    function isOfferNonceUnavailable(address signer, uint256 nonce) external view returns (bool) {
        return usedOrCancelledOfferNonces[signer][nonce];
    }

    function _sliceNewest(uint256[] storage source, uint256 offset, uint256 limit) internal view returns (uint256[] memory) {
        uint256 total = source.length;
        if (offset >= total || limit == 0) return new uint256[](0);
        uint256 count = total - offset;
        if (count > limit) count = limit;
        uint256[] memory page = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            page[i] = source[total - 1 - offset - i];
        }
        return page;
    }

    function _recordActivity(
        address user,
        ActivityAction action,
        ActivityMarket market,
        uint256 subjectId,
        address actor,
        address counterparty,
        uint256 amount,
        uint8 status,
        bytes32 metadataHash
    ) internal {
        if (user == address(0)) return;
        Activity memory activity = Activity({
            action: uint8(action),
            market: uint8(market),
            subjectId: subjectId,
            actor: actor,
            counterparty: counterparty,
            amount: amount,
            timestamp: block.timestamp,
            status: status,
            metadataHash: metadataHash
        });
        _userActivities[user].push(activity);
        uint256 activityId = _userActivities[user].length;
        emit UserActivityRecorded(
            user,
            activityId,
            activity.action,
            activity.market,
            subjectId,
            actor,
            counterparty,
            amount,
            activity.timestamp,
            status,
            metadataHash
        );
    }

    function _recordActivityForPair(
        address first,
        address second,
        ActivityAction action,
        ActivityMarket market,
        uint256 subjectId,
        address actor,
        address counterparty,
        uint256 amount,
        uint8 status,
        bytes32 metadataHash
    ) internal {
        _recordActivity(first, action, market, subjectId, actor, counterparty, amount, status, metadataHash);
        if (second != first) {
            _recordActivity(second, action, market, subjectId, actor, counterparty, amount, status, metadataHash);
        }
    }

    function _increaseLocked(address user, uint256 amount) internal {
        if (user != address(0) && amount > 0) _profileStats[user].lockedUSDC += amount;
    }

    function _decreaseLocked(address user, uint256 amount) internal {
        if (user == address(0) || amount == 0) return;
        uint256 current = _profileStats[user].lockedUSDC;
        _profileStats[user].lockedUSDC = amount >= current ? 0 : current - amount;
    }

    function _increaseActiveLoan(address first, address second) internal {
        if (first != address(0)) _profileStats[first].activeLoanCount++;
        if (second != address(0) && second != first) _profileStats[second].activeLoanCount++;
    }

    function _decreaseActiveLoan(address first, address second) internal {
        _decrementLoan(first);
        if (second != first) _decrementLoan(second);
    }

    function _decrementLoan(address user) private {
        if (user != address(0) && _profileStats[user].activeLoanCount > 0) _profileStats[user].activeLoanCount--;
    }

    function _increaseActiveDeal(address first, address second) internal {
        if (first != address(0)) _profileStats[first].activeDealCount++;
        if (second != address(0) && second != first) _profileStats[second].activeDealCount++;
    }

    function _decreaseActiveDeal(address first, address second) internal {
        _decrementDeal(first);
        if (second != first) _decrementDeal(second);
    }

    function _decrementDeal(address user) private {
        if (user != address(0) && _profileStats[user].activeDealCount > 0) _profileStats[user].activeDealCount--;
    }

    function _increaseLifetimeVolume(address first, address second, uint256 amount) internal {
        if (amount == 0) return;
        if (first != address(0)) _profileStats[first].lifetimeVolume += amount;
        if (second != address(0) && second != first) _profileStats[second].lifetimeVolume += amount;
    }
}
