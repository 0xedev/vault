// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../../contracts/VaultEscrow.sol";

/// @notice Unit tests for access control and pause/unpause
contract AccessControlTest is Test {
    VaultEscrow public escrow;

    address admin = makeAddr("admin");
    address user = makeAddr("user");
    address other = makeAddr("other");

    function setUp() public {
        vm.prank(admin);
        escrow = new VaultEscrow(150);
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════════════════════

    function test_onlyAdmin_SetPlatformFee() public {
        vm.prank(admin);
        escrow.setPlatformFee(300); // 3%
        assertEq(escrow.platformFeeBps(), 300);
    }

    function test_setPlatformFee_Revert_NotAdmin() public {
        vm.prank(user);
        vm.expectRevert(VaultEscrow.NotAdmin.selector);
        escrow.setPlatformFee(300);
    }

    function test_setPlatformFee_Revert_Max5Percent() public {
        vm.prank(admin);
        vm.expectRevert("Max 5%");
        escrow.setPlatformFee(501);
    }

    function test_transferAdmin() public {
        vm.prank(admin);
        escrow.transferAdmin(user);

        assertEq(escrow.admin(), user);

        // Old admin can no longer act
        vm.prank(admin);
        vm.expectRevert(VaultEscrow.NotAdmin.selector);
        escrow.setPlatformFee(100);
    }

    function test_transferAdmin_Revert_NotAdmin() public {
        vm.prank(user);
        vm.expectRevert(VaultEscrow.NotAdmin.selector);
        escrow.transferAdmin(user);
    }

    function test_transferAdmin_Revert_ZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert("Invalid address");
        escrow.transferAdmin(address(0));
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
        vm.expectRevert(VaultEscrow.NotAdmin.selector);
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
        vm.expectRevert(VaultEscrow.NotAdmin.selector);
        escrow.unpause();
    }

    function test_whenNotPaused_BlocksSubmitOffer() public {
        vm.prank(admin);
        escrow.pause();

        // Setup: create a listing (not paused — listNFT is not pausable)
        MockERC721 nft = new MockERC721();
        uint256 tokenId = nft.mint(user);
        vm.prank(user);
        nft.approve(address(escrow), tokenId);

        vm.deal(user, 100 ether);
        vm.prank(user);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);

        // Submit offer should be blocked
        vm.deal(other, 100 ether);
        vm.prank(other);
        vm.expectRevert(VaultEscrow.ContractPaused.selector);
        escrow.submitOffer{value: 10 ether}(listingId, 10 ether, 1420, 30);
    }

    function test_whenNotPaused_BlocksAcceptOffer() public {
        // Setup listing + offer before pausing
        MockERC721 nft = new MockERC721();
        uint256 tokenId = nft.mint(user);
        vm.prank(user);
        nft.approve(address(escrow), tokenId);

        vm.deal(user, 100 ether);
        vm.deal(other, 100 ether);

        vm.prank(user);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);

        vm.prank(other);
        escrow.submitOffer{value: 10 ether}(listingId, 10 ether, 1420, 30);

        vm.prank(admin);
        escrow.pause();

        vm.prank(user);
        vm.expectRevert(VaultEscrow.ContractPaused.selector);
        escrow.acceptOffer(listingId, other, 10 ether, 1420, 30);
    }

    function test_whenNotPaused_BlocksFundDeal() public {
        // Setup deal
        vm.prank(user);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(admin);
        escrow.verifyDeal(dealId);

        vm.prank(admin);
        escrow.pause();

        vm.deal(other, 100 ether);
        vm.prank(other);
        vm.expectRevert(VaultEscrow.ContractPaused.selector);
        escrow.fundDeal{value: 5 ether}(dealId);
    }

    function test_pause_Events() public {
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.Paused();
        escrow.pause();

        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.Unpaused();
        escrow.unpause();
    }
}
