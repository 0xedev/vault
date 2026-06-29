// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../mocks/MockERC20.sol";
import "../../contracts/VaultEscrow.sol";

contract NFTLoanTest is Test {
    VaultEscrow public escrow;
    MockERC721 public nft;
    MockERC20 public usdc;

    address admin = makeAddr("admin");
    address borrower = makeAddr("borrower");
    address lender = makeAddr("lender");
    address lender2 = makeAddr("lender2");

    uint256 constant FEE = 150;

    function setUp() public {
        usdc = new MockERC20();
        vm.prank(admin);
        escrow = new VaultEscrow(address(usdc), FEE);
        nft = new MockERC721();
        usdc.mint(lender, 1_000_000_000 ether);
        usdc.mint(lender2, 1_000_000_000 ether);
        usdc.mint(borrower, 1_000_000_000 ether);
    }

    function _listNFT(uint256 amount, uint256 apr, uint256 term) internal returns (uint256) {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        return escrow.listNFT(address(nft), tokenId, amount, apr, term);
    }

    function _submitOffer(uint256 id, address from, uint256 amount, uint256 apr, uint256 term) internal {
        vm.prank(from);
        usdc.approve(address(escrow), amount);
        vm.prank(from);
        escrow.submitOffer(id, amount, apr, term);
    }

    function _activateLoan(uint256 amount, uint256 apr, uint256 term) internal returns (uint256) {
        uint256 listingId = _listNFT(amount, apr, term);
        _submitOffer(listingId, lender, amount, apr, term);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, amount, apr, term);
        return listingId;
    }

    // ── LISTING
    function test_listNFT_OK() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        assertEq(nft.ownerOf(tokenId), address(escrow));
    }

    function test_listNFT_Event() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.Listed(1, borrower, address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
    }

    function test_listNFT_Revert_ZeroAmount() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        vm.expectRevert("Amount must be > 0");
        escrow.listNFT(address(nft), tokenId, 0, 1420, 30);
    }

    function test_listNFT_Revert_NotOwner() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(lender);
        vm.expectRevert(VaultEscrow.NotNFTOwner.selector);
        escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
    }

    function test_cancel_OK() public {
        uint256 listingId = _listNFT(10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.cancelListing(listingId);
        assertEq(nft.ownerOf(0), borrower);
    }

    // ── OFFERS
    function test_submitOffer_OK() public {
        uint256 listingId = _listNFT(10 ether, 1420, 30);
        _submitOffer(listingId, lender, 10 ether, 1420, 30);
        assertEq(escrow.listingEscrowBalance(listingId), 10 ether);
    }

    function test_submitOffer_StoresTerms() public {
        uint256 listingId = _listNFT(10 ether, 1420, 30);
        _submitOffer(listingId, lender, 10 ether, 1420, 30);
        (uint256 oApr, uint256 oTerm) = escrow.offers(listingId, lender);
        assertEq(oApr, 1420);
        assertEq(oTerm, 30);
    }

    function test_offerMismatch_Reverted() public {
        uint256 listingId = _listNFT(10 ether, 1420, 30);
        _submitOffer(listingId, lender, 10 ether, 1420, 30);
        vm.prank(borrower);
        vm.expectRevert(VaultEscrow.OfferMismatch.selector);
        escrow.acceptOffer(listingId, lender, 10 ether, 2000, 30);
    }

    // ── ACCEPT + REPAY
    function test_accept_Repay() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;
        vm.prank(borrower);
        usdc.approve(address(escrow), totalDue);
        vm.prank(borrower);
        escrow.repay(listingId, totalDue);
        assertEq(nft.ownerOf(0), borrower);
    }

    function test_repayPartial_OK() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;
        uint256 half = totalDue / 2;
        vm.prank(borrower);
        usdc.approve(address(escrow), half);
        vm.prank(borrower);
        escrow.repayPartial(listingId, half);
        (, uint256 paid, uint256 remaining) = escrow.getRepaymentDue(listingId);
        assertEq(paid, half);
        assertEq(remaining, totalDue - half);
    }

    // ── DEFAULT
    function test_claimCollateral_OK() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        vm.warp(block.timestamp + 31 days + 24 hours);
        vm.prank(lender);
        escrow.claimCollateral(listingId);
        assertEq(nft.ownerOf(0), lender);
    }

    function test_claimCollateral_Revert_BeforeGrace() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        vm.warp(block.timestamp + 30 days + 23 hours);
        vm.prank(lender);
        vm.expectRevert(VaultEscrow.GracePeriodNotPassed.selector);
        escrow.claimCollateral(listingId);
    }

    // ── DISPUTE / RESOLVE
    function test_dispute_OK() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.dispute(listingId);
    }

    function test_resolve_NFTToLender() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.dispute(listingId);
        vm.prank(admin);
        escrow.resolve(listingId, true);
        assertEq(nft.ownerOf(0), lender);
    }

    function test_resolve_NFTToBorrower() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.dispute(listingId);
        vm.prank(admin);
        escrow.resolve(listingId, false);
        assertEq(nft.ownerOf(0), borrower);
    }
}
