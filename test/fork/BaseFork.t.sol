// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../contracts/VaultEscrow.sol";
import "../../contracts/VaultNFT.sol";

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
        assertEq(escrow.nft().admins(admin), true);
        assertEq(escrow.nft().platformFeeBps(), 150);
        assertEq(escrow.nft().paused(), false);
        assertEq(escrow.deals().dealCount(), 0);
        assertEq(escrow.nft().listingCount(), 0);
    }

    function test_onERC721Received() public {
        bytes4 selector = escrow.nft().onERC721Received(address(this), address(this), 0, "");
        assertEq(selector, escrow.nft().onERC721Received.selector);
    }
}
