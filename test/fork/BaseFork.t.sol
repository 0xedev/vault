// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/VaultEscrow.sol";

/// @notice Fork tests against Base mainnet
/// @dev Requires --fork-url $BASE_RPC_URL or set in foundry.toml
contract BaseForkTest is Test {
    VaultEscrow public escrow;
    address admin = makeAddr("admin");

    // Known Base addresses
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function setUp() public {
        // Select Base fork
        vm.selectFork(vm.createFork("https://mainnet.base.org"));

        vm.prank(admin);
        escrow = new VaultEscrow(150);
    }

    /// @notice Deploy and verify the contract compiles and state is accessible on fork
    function test_DeployOnFork() public {
        assertEq(escrow.admin(), admin);
        assertEq(escrow.platformFeeBps(), 150);
        assertEq(escrow.paused(), false);
        assertEq(escrow.dealCount(), 0);
        assertEq(escrow.listingCount(), 0);
    }

    /// @notice Test that the contract can hold ETH on a fork
    function test_ReceiveETH() public {
        vm.deal(address(this), 10 ether);
        (bool success,) = address(escrow).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(address(escrow).balance, 1 ether);
    }

    /// @notice Test deal listing and funding works on fork
    function test_DealLifecycleOnFork() public {
        address seller = makeAddr("seller");
        address buyer = makeAddr("buyer");
        vm.deal(buyer, 100 ether);

        vm.prank(seller);
        uint256 dealId = escrow.listDeal(1 ether, bytes32(uint256(0x123)));

        assertEq(dealId, 1);

        vm.prank(admin);
        escrow.verifyDeal(dealId);

        vm.prank(buyer);
        escrow.fundDeal{value: 1 ether}(dealId);

        assertEq(escrow.dealEscrowBalance(dealId), 1 ether);
    }

    /// @notice ERC721Received check on fork
    function test_onERC721Received() public {
        bytes4 selector = escrow.onERC721Received(address(this), address(this), 0, "");
        assertEq(selector, escrow.onERC721Received.selector);
    }
}
