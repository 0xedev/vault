// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../mocks/MockERC20.sol";
import "../../contracts/VaultEscrow.sol";

/// @notice Branch coverage tests, updated for USDC + no admin verify + deal offers
contract BranchCoverageTest is Test {
    VaultEscrow public escrow;
    MockERC721 public nft;
    MockERC20 public usdc;

    address admin = makeAddr("admin");
    address borrower = makeAddr("borrower");
    address lender = makeAddr("lender");
    address lender2 = makeAddr("lender2");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");

    function setUp() public {
        usdc = new MockERC20();
        vm.prank(admin);
        escrow = new VaultEscrow(address(usdc), 150);
        nft = new MockERC721();
        usdc.mint(lender, 1_000_000_000 ether);
        usdc.mint(lender2, 1_000_000_000 ether);
        usdc.mint(borrower, 1_000_000_000 ether);
        usdc.mint(buyer, 1_000_000_000 ether);
        usdc.mint(seller, 1_000_000_000 ether);
        usdc.mint(admin, 1_000_000_000 ether);
    }

    /* ================================================================
       updateListing
       ================================================================ */

    function test_updateListing_ChangesTerms() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 5 ether, 1420, 30);
        vm.prank(borrower);
        escrow.updateListing(listingId, 8 ether, 2000, 60);
        (, , , uint256 p, uint256 a, uint256 t, , , , , , , ) = escrow.listings(listingId);
        assertEq(p, 8 ether);
        assertEq(a, 2000);
        assertEq(t, 60);
    }

    function test_updateListing_Revert_NotBorrower() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 5 ether, 1420, 30);
        vm.prank(lender);
        vm.expectRevert(VaultEscrow.NotBorrower.selector);
        escrow.updateListing(listingId, 8 ether, 2000, 60);
    }

    function test_updateListing_Revert_AfterFunded() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 5 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 5 ether, 1420, 30);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 5 ether, 1420, 30);
        vm.prank(borrower);
        vm.expectRevert();
        escrow.updateListing(listingId, 8 ether, 2000, 60);
    }

    /* ================================================================
       acceptOffer — excess refund
       ================================================================ */

    function test_acceptOffer_ExcessRefund_LenderSendsMore() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 5 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        uint256 lenderBalBefore = usdc.balanceOf(lender);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 5 ether, 1420, 30);
        assertEq(usdc.balanceOf(lender), lenderBalBefore + 5 ether);
    }

    function test_acceptOffer_ExactlyOfferBalance() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        (, , , , , , , , , , , , VaultEscrow.Stage s) = escrow.listings(listingId);
        assertEq(uint8(s), uint8(VaultEscrow.Stage.ACTIVE));
    }

    function test_acceptOffer_Revert_NotBorrower() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(lender);
        vm.expectRevert(VaultEscrow.NotBorrower.selector);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);
    }

    /* ================================================================
       repay — overpayment refund
       ================================================================ */

    function test_repay_WithOverpayment() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;
        uint256 overpay = totalDue + 1 ether;

        uint256 borrowerBalBefore = usdc.balanceOf(borrower);
        vm.prank(borrower);
        usdc.approve(address(escrow), overpay);
        vm.prank(borrower);
        escrow.repay(listingId, overpay);
        assertGe(usdc.balanceOf(borrower), borrowerBalBefore - totalDue);
    }

    /* ================================================================
       repayPartial — overpayment revert
       ================================================================ */

    function test_repayPartial_Revert_Overpayment() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;

        vm.prank(borrower);
        usdc.approve(address(escrow), totalDue + 1 ether);
        vm.prank(borrower);
        vm.expectRevert("Overpayment - use repay() to close");
        escrow.repayPartial(listingId, totalDue + 1 ether);
    }

    function test_repayPartial_Revert_NotBorrower() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        vm.prank(lender);
        usdc.approve(address(escrow), 1 ether);
        vm.prank(lender);
        vm.expectRevert(VaultEscrow.NotBorrower.selector);
        escrow.repayPartial(listingId, 1 ether);
    }

    /* ================================================================
       claimCollateral — not active
       ================================================================ */

    function test_claimCollateral_Revert_NotActive() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.warp(block.timestamp + 31 days);
        vm.prank(lender);
        vm.expectRevert();
        escrow.claimCollateral(listingId);
    }

    /* ================================================================
       resolve — not admin
       ================================================================ */

    function test_resolve_NotAdmin() public {
        vm.expectRevert(VaultEscrow.NotAdmin.selector);
        vm.prank(lender);
        escrow.resolve(1, false);
    }

    /* ================================================================
       deal — cancelDeal, updateDeal
       ================================================================ */

    function test_cancelDeal_AfterFunded_Revert() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        vm.expectRevert();
        escrow.cancelDeal(dealId);
    }

    function test_updateDeal() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        bytes32 newHash = bytes32(uint256(0xbeef));
        vm.prank(seller);
        escrow.updateDeal(dealId, 3 ether, newHash);
        (, , uint256 price, bytes32 hash, , , , , ) = escrow.deals(dealId);
        assertEq(price, 3 ether);
        assertEq(hash, newHash);
    }

    function test_updateDeal_Revert_NotSeller() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        vm.expectRevert(VaultEscrow.NotDealParty.selector);
        escrow.updateDeal(dealId, 3 ether, bytes32(uint256(0xbeef)));
    }

    /* ================================================================
       extendDeadline
       ================================================================ */

    function test_extendDeadline_Revert_NotFunded() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(seller);
        vm.expectRevert();
        escrow.extendDeadline(dealId);
    }

    function test_extendDeadline_Revert_MaxExtension() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);

        // First two extensions put deadline at createdAt + 13d (under createdAt + 14d max)
        vm.startPrank(seller);
        escrow.extendDeadline(dealId);
        escrow.extendDeadline(dealId);

        // Third extension would push deadline to createdAt + 16d, exceeding max
        vm.expectRevert("Cannot extend beyond 14 days");
        escrow.extendDeadline(dealId);
        vm.stopPrank();
    }

    function test_extendDeadline_NotSeller() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(buyer);
        vm.expectRevert(VaultEscrow.NotDealParty.selector);
        escrow.extendDeadline(dealId);
    }

    /* ================================================================
       disputeDeal revert paths
       ================================================================ */

    function test_disputeDeal_Revert_BeforeDeliver() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(buyer);
        vm.expectRevert();
        escrow.disputeDeal(dealId);
    }

    function test_disputeDeal_Revert_ThirdParty() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        address random = makeAddr("random");
        vm.prank(random);
        vm.expectRevert(VaultEscrow.NotDealParty.selector);
        escrow.disputeDeal(dealId);
    }

    /* ================================================================
       resolveDeal branches
       ================================================================ */

    function test_resolveDeal_AllToSeller() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        vm.prank(buyer);
        escrow.disputeDeal(dealId);
        vm.prank(admin);
        escrow.resolveDeal(dealId, 0, 5 ether);
        assertEq(escrow.dealEscrowBalance(dealId), 0);
    }

    function test_resolveDeal_AllToBuyer() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        vm.prank(buyer);
        escrow.disputeDeal(dealId);
        uint256 buyerBalBefore = usdc.balanceOf(buyer);
        vm.prank(admin);
        escrow.resolveDeal(dealId, 5 ether, 0);
        assertEq(usdc.balanceOf(buyer), buyerBalBefore + 5 ether);
    }

    function test_resolveDeal_Revert_NotAdmin() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        vm.prank(buyer);
        escrow.disputeDeal(dealId);
        vm.prank(seller);
        vm.expectRevert(VaultEscrow.NotAdmin.selector);
        escrow.resolveDeal(dealId, 2 ether, 3 ether);
    }

    function test_refundDeal_Revert_NotFunded() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.warp(block.timestamp + 8 days);
        vm.prank(buyer);
        vm.expectRevert();
        escrow.refundDeal(dealId);
    }

    /* ================================================================
       MiniApp branches
       ================================================================ */

    function test_cancelMiniApp() public {
        vm.prank(seller);
        uint256 miniId = escrow.listMiniApp(5 ether, bytes32(uint256(1)));
        vm.prank(seller);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.MiniAppCancelled(miniId);
        escrow.cancelMiniApp(miniId);
    }

    function test_cancelMiniApp_Revert_InvalidId() public {
        vm.prank(seller);
        vm.expectRevert("Not found");
        escrow.cancelMiniApp(999);
    }

    function test_updateMiniApp() public {
        vm.prank(seller);
        uint256 miniId = escrow.listMiniApp(5 ether, bytes32(uint256(1)));
        bytes32 newHash = bytes32(uint256(0xbeef));
        vm.prank(seller);
        escrow.updateMiniApp(miniId, 3 ether, newHash);
        uint256 dealId = 1;
        (, , uint256 price, bytes32 hash, , , , , ) = escrow.deals(dealId);
        assertEq(price, 3 ether);
        assertEq(hash, newHash);
    }

    function test_updateMiniApp_Revert_InvalidId() public {
        vm.prank(seller);
        vm.expectRevert("Not found");
        escrow.updateMiniApp(999, 3 ether, bytes32(uint256(0xbeef)));
    }

    function test_pauseAndUnpause_Resume() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(admin);
        escrow.pause();
        assertTrue(escrow.paused());
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        vm.expectRevert(VaultEscrow.ContractPaused.selector);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(admin);
        escrow.unpause();
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
    }

    /* ================================================================
       View helpers
       ================================================================ */

    function test_getOfferLenders() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        address[] memory lenders = escrow.getOfferLenders(listingId);
        assertEq(lenders.length, 1);
        assertEq(lenders[0], lender);
    }

    function test_getOfferCount() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        assertEq(escrow.getOfferCount(listingId), 0);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        assertEq(escrow.getOfferCount(listingId), 1);
    }

    function test_getDeadline() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        uint256 deadline = escrow.getDeadline(listingId);
        assertEq(deadline, block.timestamp + 30 days);
    }

    function test_getRepaymentDue() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        (uint256 total, uint256 paid, uint256 remaining) = escrow.getRepaymentDue(listingId);
        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        assertEq(total, 10 ether + interest);
        assertEq(paid, 0);
        assertEq(remaining, total);
    }

    /* ================================================================
       buyMiniApp revert paths
       ================================================================ */

    function test_buyMiniApp_Revert_SelfBuy() public {
        vm.prank(seller);
        uint256 miniId = escrow.listMiniApp(5 ether, bytes32(uint256(1)));
        vm.prank(seller);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(seller);
        vm.expectRevert("Seller cannot buy own listing");
        escrow.buyMiniApp(miniId, 5 ether);
    }

    function test_buyMiniApp_Revert_WrongPrice() public {
        vm.prank(seller);
        uint256 miniId = escrow.listMiniApp(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 3 ether);
        vm.prank(buyer);
        vm.expectRevert("Amount must equal listing price");
        escrow.buyMiniApp(miniId, 3 ether);
    }

    function test_buyMiniApp_Revert_AfterFunded() public {
        vm.prank(seller);
        uint256 miniId = escrow.listMiniApp(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(1, 5 ether); // fund the underlying deal
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        vm.expectRevert(); // deal not at LISTED anymore
        escrow.buyMiniApp(miniId, 5 ether);
    }

    /* ================================================================
       dispute (loan) — not a party
       ================================================================ */

    function test_dispute_Revert_NotParty() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        address random = makeAddr("random");
        vm.prank(random);
        vm.expectRevert();
        escrow.dispute(listingId);
    }

    /* ================================================================
       withdrawOffer — after accept
       ================================================================ */

    function test_withdrawOffer_Revert_AfterAccept() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        vm.prank(lender);
        vm.expectRevert("No deposit for this listing");
        escrow.withdrawOffer(listingId);
    }

    function test_withdrawOffer_ClearsOfferStruct() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(lender);
        escrow.withdrawOffer(listingId);
        (uint256 oApr, uint256 oTerm) = escrow.offers(listingId, lender);
        assertEq(oApr, 0);
        assertEq(oTerm, 0);
    }

    /* ================================================================
       cancelListing event
       ================================================================ */

    function test_cancelListing_Event() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(borrower);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.Cancelled(listingId);
        escrow.cancelListing(listingId);
    }

    /* ================================================================
       admin events
       ================================================================ */

    function test_admin_Events() public {
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.AdminTransferred(admin, lender);
        escrow.transferAdmin(lender);
        vm.prank(lender);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.PlatformFeeUpdated(300);
        escrow.setPlatformFee(300);
    }

    /* ================================================================
       cancelDeal event
       ================================================================ */

    function test_cancelDeal_Event() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(seller);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.DealCancelled(dealId);
        escrow.cancelDeal(dealId);
    }

    /* ================================================================
       fundDeal event
       ================================================================ */

    function test_fundDeal_Event() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.DealFunded(dealId, buyer, 5 ether);
        escrow.fundDeal(dealId, 5 ether);
    }

    /* ================================================================
       confirmDelivery event
       ================================================================ */

    function test_confirmDelivery_Event() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        uint256 net = 5 ether - (5 ether * 150 / 10000);
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.DealConfirmed(dealId, net);
        escrow.confirmDelivery(dealId);
    }

    /* ================================================================
       dispute/refund deal events
       ================================================================ */

    function test_disputeDeal_Event() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.DealDisputed(dealId);
        escrow.disputeDeal(dealId);
    }

    function test_refundDeal_Event() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.warp(block.timestamp + 8 days);
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.DealRefunded(dealId);
        escrow.refundDeal(dealId);
    }

    /* ================================================================
       resolveDeal dust path
       ================================================================ */

    function test_resolveDeal_DustPath() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        vm.prank(buyer);
        escrow.disputeDeal(dealId);
        vm.prank(admin);
        escrow.resolveDeal(dealId, 2 ether, 2 ether);
        assertEq(escrow.dealEscrowBalance(dealId), 0);
    }

    /* ================================================================
       Deal offer system
       ================================================================ */

    function test_submitDealOffer_OK() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 3 ether);
        vm.prank(buyer);
        escrow.submitDealOffer(dealId, 3 ether);
        assertEq(escrow.dealOfferDeposits(dealId, buyer), 3 ether);
    }

    function test_withdrawDealOffer_OK() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 3 ether);
        vm.prank(buyer);
        escrow.submitDealOffer(dealId, 3 ether);
        uint256 balBefore = usdc.balanceOf(buyer);
        vm.prank(buyer);
        escrow.withdrawDealOffer(dealId);
        assertEq(usdc.balanceOf(buyer), balBefore + 3 ether);
        assertEq(escrow.dealOfferDeposits(dealId, buyer), 0);
    }

    function test_acceptDealOffer_AutoRefundsOthers() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));

        address buyer2 = makeAddr("buyer2");
        usdc.mint(buyer2, 1_000_000_000 ether);

        // buyer offers 3
        vm.prank(buyer);
        usdc.approve(address(escrow), 3 ether);
        vm.prank(buyer);
        escrow.submitDealOffer(dealId, 3 ether);

        // buyer2 offers 4
        vm.prank(buyer2);
        usdc.approve(address(escrow), 4 ether);
        vm.prank(buyer2);
        escrow.submitDealOffer(dealId, 4 ether);

        uint256 balB2Before = usdc.balanceOf(buyer2);

        // seller accepts buyer's offer at 3 — buyer2 gets auto-refunded
        vm.prank(seller);
        escrow.acceptDealOffer(dealId, buyer);

        assertEq(usdc.balanceOf(buyer2), balB2Before + 4 ether);
        assertEq(escrow.dealOfferDeposits(dealId, buyer2), 0);
        assertEq(escrow.dealEscrowBalance(dealId), 3 ether);
    }

    function test_acceptDealOffer_StageBecomesFunded() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 4 ether);
        vm.prank(buyer);
        escrow.submitDealOffer(dealId, 4 ether);
        vm.prank(seller);
        escrow.acceptDealOffer(dealId, buyer);
        (, , uint256 price, , uint256 deadline, , VaultEscrow.DealStage stage, , ) = escrow.deals(dealId);
        assertEq(price, 4 ether);
        assertEq(uint256(stage), uint256(VaultEscrow.DealStage.FUNDED));
        assertGt(deadline, 0);
    }

    function test_getDealOfferCount() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        assertEq(escrow.getDealOfferCount(dealId), 0);

        vm.prank(buyer);
        usdc.approve(address(escrow), 3 ether);
        vm.prank(buyer);
        escrow.submitDealOffer(dealId, 3 ether);
        assertEq(escrow.getDealOfferCount(dealId), 1);
    }

    function test_getDealOfferBuyers() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 3 ether);
        vm.prank(buyer);
        escrow.submitDealOffer(dealId, 3 ether);
        address[] memory buyers = escrow.getDealOfferBuyers(dealId);
        assertEq(buyers.length, 1);
        assertEq(buyers[0], buyer);
    }
}
