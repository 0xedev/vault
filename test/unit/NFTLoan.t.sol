// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../mocks/MockERC20.sol";
import "../../contracts/VaultNFT.sol";

contract NFTLoanTest is Test {
    VaultNFT public escrowNft;
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
        escrowNft = new VaultNFT(address(usdc), FEE);
        nft = new MockERC721();
        usdc.mint(lender, 1_000_000_000 ether);
        usdc.mint(lender2, 1_000_000_000 ether);
        usdc.mint(borrower, 1_000_000_000 ether);
    }

    function _listNFT(uint256 amount, uint256 apr, uint256 term) internal returns (uint256) {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        return escrowNft.listNFT(address(nft), tokenId, amount, apr, term);
    }

    function _submitOffer(uint256 id, address from, uint256 amount, uint256 apr, uint256 term) internal {
        vm.prank(from);
        usdc.approve(address(escrowNft), amount);
        vm.prank(from);
        escrowNft.submitOffer(id, amount, apr, term);
    }

    function _activateLoan(uint256 amount, uint256 apr, uint256 term) internal returns (uint256) {
        uint256 listingId = _listNFT(amount, apr, term);
        _submitOffer(listingId, lender, amount, apr, term);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, amount, apr, term);
        return listingId;
    }

    // ── LISTING
    function test_listNFT_OK() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        assertEq(nft.ownerOf(tokenId), address(escrowNft));
    }

    function test_listNFT_Event() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.expectEmit(true, true, true, true);
        emit VaultNFT.Listed(1, borrower, address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
    }

    function test_listNFT_Revert_ZeroAmount() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        vm.expectRevert("Amount must be > 0");
        escrowNft.listNFT(address(nft), tokenId, 0, 1420, 30);
    }

    function test_listNFT_Revert_NotOwner() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(lender);
        vm.expectRevert(VaultNFT.NotNFTOwner.selector);
        escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
    }

    function test_cancel_OK() public {
        uint256 listingId = _listNFT(10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.cancelListing(listingId);
        assertEq(nft.ownerOf(0), borrower);
    }

    // ── OFFERS
    function test_submitOffer_OK() public {
        uint256 listingId = _listNFT(10 ether, 1420, 30);
        _submitOffer(listingId, lender, 10 ether, 1420, 30);
        assertEq(escrowNft.listingEscrowBalance(listingId), 10 ether);
    }

    function test_submitOffer_StoresTerms() public {
        uint256 listingId = _listNFT(10 ether, 1420, 30);
        _submitOffer(listingId, lender, 10 ether, 1420, 30);
        (uint256 oApr, uint256 oTerm) = escrowNft.offers(listingId, lender);
        assertEq(oApr, 1420);
        assertEq(oTerm, 30);
    }

    function test_offerMismatch_Reverted() public {
        uint256 listingId = _listNFT(10 ether, 1420, 30);
        _submitOffer(listingId, lender, 10 ether, 1420, 30);
        vm.prank(borrower);
        vm.expectRevert(VaultNFT.OfferMismatch.selector);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 2000, 30);
    }

    // ── ACCEPT + REPAY
    function test_accept_Repay() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;
        vm.prank(borrower);
        usdc.approve(address(escrowNft), totalDue);
        vm.prank(borrower);
        escrowNft.repay(listingId, totalDue);
        assertEq(nft.ownerOf(0), borrower);
    }

    function test_repayPartial_OK() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;
        uint256 half = totalDue / 2;
        vm.prank(borrower);
        usdc.approve(address(escrowNft), half);
        vm.prank(borrower);
        escrowNft.repayPartial(listingId, half);
        (, uint256 paid, uint256 remaining) = escrowNft.getRepaymentDue(listingId);
        assertEq(paid, half);
        assertEq(remaining, totalDue - half);
    }

    // ── DEFAULT
    function test_claimCollateral_OK() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        vm.warp(block.timestamp + 31 days + 24 hours);
        vm.prank(lender);
        escrowNft.claimCollateral(listingId);
        assertEq(nft.ownerOf(0), lender);
    }

    function test_claimCollateral_Revert_BeforeGrace() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        vm.warp(block.timestamp + 30 days + 23 hours);
        vm.prank(lender);
        vm.expectRevert(VaultNFT.GracePeriodNotPassed.selector);
        escrowNft.claimCollateral(listingId);
    }

    // ── DISPUTE / RESOLVE
    function test_dispute_OK() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.dispute(listingId);
    }

    function test_resolve_NFTToLender() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.dispute(listingId);
        vm.prank(admin);
        escrowNft.resolve(listingId, true);
        assertEq(nft.ownerOf(0), lender);
    }

    function test_resolve_NFTToBorrower() public {
        uint256 listingId = _activateLoan(10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.dispute(listingId);
        vm.prank(admin);
        escrowNft.resolve(listingId, false);
        assertEq(nft.ownerOf(0), borrower);
    }
}
