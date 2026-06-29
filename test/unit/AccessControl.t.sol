// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../mocks/MockERC20.sol";
import "../../contracts/VaultNFT.sol";
import "../../contracts/VaultDeals.sol";

contract AccessControlTest is Test {
    VaultNFT public escrowNft;
    VaultDeals public escrow;
    MockERC20 public usdc;
    MockERC721 public nft;

    address admin = makeAddr("admin");
    address user = makeAddr("user");
    address other = makeAddr("other");
    address user2 = makeAddr("user2");

    function setUp() public {
        usdc = new MockERC20();
        nft = new MockERC721();
        vm.prank(admin);
        escrowNft = new VaultNFT(address(usdc), 150);
        vm.prank(admin);
        escrow = new VaultDeals(address(usdc), 150);
        usdc.mint(user, 1_000_000_000 ether);
        usdc.mint(other, 1_000_000_000 ether);
        usdc.mint(admin, 1_000_000_000 ether);
        vm.prank(user);
        usdc.approve(address(escrowNft), type(uint256).max);
        vm.prank(other);
        usdc.approve(address(escrowNft), type(uint256).max);
        vm.prank(user);
        usdc.approve(address(escrow), type(uint256).max);
        vm.prank(other);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════════════════════

    function test_onlyAdmin_SetPlatformFee() public {
        vm.prank(admin);
        escrow.setPlatformFee(300);
        assertEq(escrow.platformFeeBps(), 300);
    }

    function test_setPlatformFee_Revert_NotAdmin() public {
        vm.prank(user);
        vm.expectRevert(VaultCore.NotAdmin.selector);
        escrow.setPlatformFee(300);
    }

    function test_setPlatformFee_Revert_Max5Percent() public {
        vm.prank(admin);
        vm.expectRevert("Max 5%");
        escrow.setPlatformFee(501);
    }

    function test_addRemoveAdmin() public {
        vm.prank(admin);
        escrow.addAdmin(user);
        assertTrue(escrow.admins(user));
        assertEq(escrow.adminCount(), 2);

        vm.prank(admin);
        escrow.removeAdmin(user);
        assertFalse(escrow.admins(user));
        assertEq(escrow.adminCount(), 1);
    }

    function test_addAdmin_Revert_NotAdmin() public {
        vm.prank(user);
        vm.expectRevert(VaultCore.NotAdmin.selector);
        escrow.addAdmin(user);
    }

    function test_addAdmin_Revert_ZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert("Invalid address");
        escrow.addAdmin(address(0));
    }

    function test_removeAdmin_Revert_NotAdmin() public {
        vm.prank(user);
        vm.expectRevert(VaultCore.NotAdmin.selector);
        escrow.removeAdmin(admin);
    }

    function test_removeAdmin_Revert_NotAdminAddr() public {
        vm.prank(admin);
        vm.expectRevert("Not an admin");
        escrow.removeAdmin(user);
    }

    function test_removeAdmin_Revert_CannotRemoveSelf() public {
        vm.prank(admin);
        vm.expectRevert("Cannot remove last admin");
        escrow.removeAdmin(admin);
    }

    function test_isAdmin() public {
        assertTrue(escrow.admins(admin));
        assertFalse(escrow.admins(user));
    }

    // ═══════════════════════════════════════════════════════════
    //  PAUSE / UNPAUSE
    // ═══════════════════════════════════════════════════════════

    function test_pause() public {
        vm.prank(admin);
        escrow.pause();
        assertTrue(escrow.paused());
    }

    function test_pause_Revert_NotAdmin() public {
        vm.prank(user);
        vm.expectRevert(VaultCore.NotAdmin.selector);
        escrow.pause();
    }

    function test_unpause() public {
        vm.prank(admin);
        escrow.pause();
        assertTrue(escrow.paused());

        vm.prank(admin);
        escrow.unpause();
        assertFalse(escrow.paused());
    }

    function test_unpause_Revert_NotAdmin() public {
        vm.prank(admin);
        escrow.pause();

        vm.prank(user);
        vm.expectRevert(VaultCore.NotAdmin.selector);
        escrow.unpause();
    }

    function test_whenNotPaused_BlocksSubmitOffer() public {
        vm.prank(admin);
        escrowNft.pause();

        MockERC721 nft = new MockERC721();
        uint256 tokenId = nft.mint(user);
        vm.prank(user);
        nft.approve(address(escrowNft), tokenId);

        vm.prank(user);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);

        vm.prank(other);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(other);
        vm.expectRevert(VaultCore.ContractPaused.selector);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
    }

    function test_whenNotPaused_BlocksAcceptOffer() public {
        MockERC721 nft = new MockERC721();
        uint256 tokenId = nft.mint(user);
        vm.prank(user);
        nft.approve(address(escrowNft), tokenId);

        vm.prank(user);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);

        vm.prank(other);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(other);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);

        vm.prank(admin);
        escrowNft.pause();

        vm.prank(user);
        vm.expectRevert(VaultCore.ContractPaused.selector);
        escrowNft.acceptOffer(listingId, other, 10 ether, 1420, 30);
    }

    function test_whenNotPaused_BlocksFundDeal() public {
        vm.prank(user);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));

        vm.prank(admin);
        escrow.pause();

        vm.prank(other);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(other);
        vm.expectRevert(VaultCore.ContractPaused.selector);
        escrow.fundDeal(dealId, 5 ether);
    }

    function test_pause_Events() public {
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit VaultCore.Paused();
        escrow.pause();

        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit VaultCore.Unpaused();
        escrow.unpause();
    }
}
