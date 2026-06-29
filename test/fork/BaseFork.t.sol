// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/VaultEscrow.sol";

/// @notice Fork tests against Base mainnet
contract BaseForkTest is Test {
    VaultEscrow public escrow;
    address admin = makeAddr("admin");

    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function setUp() public {
        vm.selectFork(vm.createFork("https://mainnet.base.org"));
        vm.prank(admin);
        escrow = new VaultEscrow(USDC, 150);
    }

    function test_DeployOnFork() public {
        assertEq(escrow.admin(), admin);
        assertEq(escrow.platformFeeBps(), 150);
        assertEq(escrow.paused(), false);
        assertEq(escrow.dealCount(), 0);
        assertEq(escrow.listingCount(), 0);
    }

    function test_onERC721Received() public {
        bytes4 selector = escrow.onERC721Received(address(this), address(this), 0, "");
        assertEq(selector, escrow.onERC721Received.selector);
    }
}
