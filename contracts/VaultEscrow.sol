// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VaultEscrow
 * @notice Simple escrow with EOA admin. Buyer deposits, seller delivers,
 *         admin can resolve disputes. No multi-sig — single admin key.
 */
contract VaultEscrow {
    address public admin;
    uint256 public platformFeeBps; // basis points (150 = 1.5%)

    enum Stage { AWAITING_DEPOSIT, FUNDED, DISPUTED, RELEASED, REFUNDED }

    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        Stage stage;
        uint256 deadline;
        bytes32 metadataHash; // IPFS hash of listing/terms data
    }

    uint256 public escrowCount;
    mapping(uint256 => Escrow) public escrows;

    event Deposited(uint256 indexed escrowId, address buyer, uint256 amount);
    event Released(uint256 indexed escrowId, address seller, uint256 amount, uint256 fee);
    event Refunded(uint256 indexed escrowId, address buyer, uint256 amount);
    event Disputed(uint256 indexed escrowId);
    event Resolved(uint256 indexed escrowId, Stage outcome, uint256 buyerAmount, uint256 sellerAmount);

    error NotAdmin();
    error NotParty();
    error InvalidStage(Stage current, Stage expected);
    error DeadlineNotPassed();
    error DeadlinePassed();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyParty(uint256 escrowId) {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.buyer && msg.sender != e.seller) revert NotParty();
        _;
    }

    modifier atStage(uint256 escrowId, Stage expected) {
        if (escrows[escrowId].stage != expected) revert InvalidStage(escrows[escrowId].stage, expected);
        _;
    }

    constructor(uint256 _platformFeeBps) {
        admin = msg.sender;
        platformFeeBps = _platformFeeBps;
    }

    /// @notice Buyer deposits funds. Escrow moves to FUNDED.
    function deposit(address seller, uint256 deadline, bytes32 metadataHash) external payable returns (uint256) {
        require(msg.value > 0, "Must send ETH");
        require(deadline > block.timestamp, "Deadline must be in the future");

        escrowCount++;
        escrows[escrowCount] = Escrow({
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            stage: Stage.FUNDED,
            deadline: deadline,
            metadataHash: metadataHash
        });

        emit Deposited(escrowCount, msg.sender, msg.value);
        return escrowCount;
    }

    /// @notice Seller claims release after delivery. Moves to RELEASED.
    function release(uint256 escrowId) external onlyParty(escrowId) atStage(escrowId, Stage.FUNDED) {
        Escrow storage e = escrows[escrowId];

        uint256 fee = (e.amount * platformFeeBps) / 10000;
        uint256 net = e.amount - fee;

        e.stage = Stage.RELEASED;

        (bool sent,) = e.seller.call{value: net}("");
        require(sent, "Transfer to seller failed");

        if (fee > 0) {
            (bool feeSent,) = admin.call{value: fee}("");
            require(feeSent, "Fee transfer failed");
        }

        emit Released(escrowId, e.seller, net, fee);
    }

    /// @notice Buyer refunds after deadline passes with no delivery.
    function refund(uint256 escrowId) external onlyParty(escrowId) atStage(escrowId, Stage.FUNDED) {
        Escrow storage e = escrows[escrowId];
        if (block.timestamp < e.deadline) revert DeadlineNotPassed();

        e.stage = Stage.REFUNDED;

        (bool sent,) = e.buyer.call{value: e.amount}("");
        require(sent, "Refund failed");

        emit Refunded(escrowId, e.buyer, e.amount);
    }

    /// @notice Either party can raise a dispute. Moves to DISPUTED.
    function dispute(uint256 escrowId) external onlyParty(escrowId) atStage(escrowId, Stage.FUNDED) {
        escrows[escrowId].stage = Stage.DISPUTED;
        emit Disputed(escrowId);
    }

    /// @notice Admin resolves a dispute. Can split, refund, or release.
    /// @param buyerBps Percentage (in basis points) that goes to buyer. 0 = full refund, 10000 = full release.
    function resolve(uint256 escrowId, uint256 buyerBps) external onlyAdmin atStage(escrowId, Stage.DISPUTED) {
        require(buyerBps <= 10000, "bps must be <= 10000");

        Escrow storage e = escrows[escrowId];
        uint256 buyerAmount = (e.amount * buyerBps) / 10000;
        uint256 sellerAmount = e.amount - buyerAmount;

        if (buyerAmount > 0) {
            e.stage = Stage.REFUNDED;
            (bool sent,) = e.buyer.call{value: buyerAmount}("");
            require(sent, "Transfer to buyer failed");
        }

        if (sellerAmount > 0) {
            e.stage = Stage.RELEASED;
            uint256 fee = (sellerAmount * platformFeeBps) / 10000;
            uint256 net = sellerAmount - fee;
            (bool sent,) = e.seller.call{value: net}("");
            require(sent, "Transfer to seller failed");
            if (fee > 0) {
                (bool feeSent,) = admin.call{value: fee}("");
                require(feeSent, "Fee transfer failed");
            }
        }

        emit Resolved(escrowId, e.stage, buyerAmount, sellerAmount);
    }

    /// @notice Admin can update the platform fee.
    function setPlatformFee(uint256 newFeeBps) external onlyAdmin {
        require(newFeeBps <= 500, "Max 5%");
        platformFeeBps = newFeeBps;
    }

    /// @notice Admin can transfer ownership.
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }

    receive() external payable {}
}
