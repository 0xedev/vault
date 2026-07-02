// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../mocks/MockERC20.sol";
import "../../contracts/VaultNFT.sol";
import "../../contracts/VaultDeals.sol";

/// @notice Branch coverage tests, updated for USDC + no admin verify + deal offers
contract BranchCoverageTest is Test {
    VaultNFT public escrowNft;
    VaultDeals public escrowD;
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
        escrowNft = new VaultNFT(address(usdc), 150, admin);
        vm.prank(admin);
        escrowD = new VaultDeals(address(usdc), 150, admin);
        nft = new MockERC721();
        usdc.mint(lender, 1_000_000_000 ether);
        usdc.mint(lender2, 1_000_000_000 ether);
        usdc.mint(borrower, 1_000_000_000 ether);
        usdc.mint(buyer, 1_000_000_000 ether);
        usdc.mint(seller, 1_000_000_000 ether);
        usdc.mint(admin, 1_000_000_000 ether);

        vm.prank(lender);
        usdc.approve(address(escrowNft), type(uint256).max);
        vm.prank(lender2);
        usdc.approve(address(escrowNft), type(uint256).max);
        vm.prank(buyer);
        usdc.approve(address(escrowNft), type(uint256).max);
        vm.prank(borrower);
        usdc.approve(address(escrowNft), type(uint256).max);
        vm.prank(seller);
        usdc.approve(address(escrowD), type(uint256).max);
        vm.prank(buyer);
        usdc.approve(address(escrowD), type(uint256).max);
    }

    /* ================================================================
       updateListing
       ================================================================ */

    function test_updateListing_ChangesTerms() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 5 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.updateListing(listingId, 8 ether, 2000, 60);
        (, , , uint256 p, uint256 a, uint256 t, , , , , , , ) = escrowNft.listings(listingId);
        assertEq(p, 8 ether);
        assertEq(a, 2000);
        assertEq(t, 60);
    }

    function test_updateListing_Revert_NotBorrower() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 5 ether, 1420, 30);
        vm.prank(lender);
        vm.expectRevert(VaultNFT.NotBorrower.selector);
        escrowNft.updateListing(listingId, 8 ether, 2000, 60);
    }

    function test_updateListing_Revert_AfterFunded() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 5 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 5 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 5 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 5 ether, 1420, 30);
        vm.prank(borrower);
        vm.expectRevert();
        escrowNft.updateListing(listingId, 8 ether, 2000, 60);
    }

    /* ================================================================
       acceptOffer — excess refund
       ================================================================ */

    function test_acceptOffer_ExcessRefund_LenderSendsMore() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 5 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        uint256 lenderBalBefore = usdc.balanceOf(lender);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 5 ether, 1420, 30);
        assertEq(usdc.balanceOf(lender), lenderBalBefore + 5 ether);
    }

    function test_acceptOffer_ExactlyOfferBalance() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        (, , , , , , , , , , , , VaultNFT.Stage s) = escrowNft.listings(listingId);
        assertEq(uint8(s), uint8(VaultNFT.Stage.ACTIVE));
    }

    function test_acceptOffer_Revert_NotBorrower() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(lender);
        vm.expectRevert(VaultNFT.NotBorrower.selector);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);
    }

    /* ================================================================
       repay — overpayment refund
       ================================================================ */

    function test_repay_WithOverpayment() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;
        uint256 overpay = totalDue + 1 ether;

        uint256 borrowerBalBefore = usdc.balanceOf(borrower);
        vm.prank(borrower);
        usdc.approve(address(escrowNft), overpay);
        vm.prank(borrower);
        escrowNft.repay(listingId, overpay);
        assertGe(usdc.balanceOf(borrower), borrowerBalBefore - totalDue);
    }

    /* ================================================================
       repayPartial — overpayment revert
       ================================================================ */

    function test_repayPartial_Revert_Overpayment() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;

        vm.prank(borrower);
        usdc.approve(address(escrowNft), totalDue + 1 ether);
        vm.prank(borrower);
        vm.expectRevert("Overpayment - use repay() to close");
        escrowNft.repayPartial(listingId, totalDue + 1 ether);
    }

    function test_repayPartial_Revert_NotBorrower() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        vm.prank(lender);
        usdc.approve(address(escrowNft), 1 ether);
        vm.prank(lender);
        vm.expectRevert(VaultNFT.NotBorrower.selector);
        escrowNft.repayPartial(listingId, 1 ether);
    }

    /* ================================================================
       claimCollateral — not active
       ================================================================ */

    function test_claimCollateral_Revert_NotActive() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.warp(block.timestamp + 31 days);
        vm.prank(lender);
        vm.expectRevert();
        escrowNft.claimCollateral(listingId);
    }

    /* ================================================================
       resolve — not admin
       ================================================================ */

    function test_resolve_NotAdmin() public {
        vm.expectRevert(VaultCore.NotAdmin.selector);
        vm.prank(lender);
        escrowNft.resolve(1, false);
    }

    /* ================================================================
       deal — cancelDeal, updateDeal
       ================================================================ */

    function test_cancelDeal_AfterFunded_Revert() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        vm.expectRevert();
        escrowD.cancelDeal(dealId);
    }

    function test_updateDeal() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        bytes32 newHash = bytes32(uint256(0xbeef));
        vm.prank(seller);
        escrowD.updateDeal(dealId, 3 ether, newHash);
        (, , uint256 price, bytes32 hash, , , , , ) = escrowD.deals(dealId);
        assertEq(price, 3 ether);
        assertEq(hash, newHash);
    }

    function test_updateDeal_Revert_NotSeller() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        vm.expectRevert(VaultDeals.NotDealParty.selector);
        escrowD.updateDeal(dealId, 3 ether, bytes32(uint256(0xbeef)));
    }

    /* ================================================================
       extendDeadline
       ================================================================ */

    function test_extendDeadline_Revert_NotFunded() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(seller);
        vm.expectRevert();
        escrowD.extendDeadline(dealId);
    }

    function test_extendDeadline_Revert_MaxExtension() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);

        // First two extensions put deadline at createdAt + 13d (under createdAt + 14d max)
        vm.startPrank(seller);
        escrowD.extendDeadline(dealId);
        escrowD.extendDeadline(dealId);

        // Third extension would push deadline to createdAt + 16d, exceeding max
        vm.expectRevert("Cannot extend beyond 14 days");
        escrowD.extendDeadline(dealId);
        vm.stopPrank();
    }

    function test_extendDeadline_NotSeller() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(buyer);
        vm.expectRevert(VaultDeals.NotDealParty.selector);
        escrowD.extendDeadline(dealId);
    }

    /* ================================================================
       disputeDeal revert paths
       ================================================================ */

    function test_disputeDeal_Revert_AtListed() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(VaultDeals.InvalidDealStage.selector, VaultDeals.DealStage.LISTED, VaultDeals.DealStage.DELIVERED)
        );
        escrowD.disputeDeal(dealId);
    }

    function test_disputeDeal_Revert_ThirdParty() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrowD.markDelivered(dealId);
        address random = makeAddr("random");
        vm.prank(random);
        vm.expectRevert(VaultDeals.NotDealParty.selector);
        escrowD.disputeDeal(dealId);
    }

    /* ================================================================
       resolveDeal branches
       ================================================================ */

    function test_resolveDeal_AllToSeller() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrowD.markDelivered(dealId);
        vm.prank(buyer);
        escrowD.disputeDeal(dealId);
        vm.prank(admin);
        escrowD.resolveDeal(dealId, 0, 5 ether);
        assertEq(escrowD.dealEscrowBalance(dealId), 0);
    }

    function test_resolveDeal_AllToBuyer() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrowD.markDelivered(dealId);
        vm.prank(buyer);
        escrowD.disputeDeal(dealId);
        uint256 buyerBalBefore = usdc.balanceOf(buyer);
        vm.prank(admin);
        escrowD.resolveDeal(dealId, 5 ether, 0);
        assertEq(usdc.balanceOf(buyer), buyerBalBefore + 5 ether);
    }

    function test_resolveDeal_Revert_NotAdmin() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrowD.markDelivered(dealId);
        vm.prank(buyer);
        escrowD.disputeDeal(dealId);
        vm.prank(seller);
        vm.expectRevert(VaultCore.NotAdmin.selector);
        escrowD.resolveDeal(dealId, 2 ether, 3 ether);
    }

    function test_refundDeal_Revert_NotFunded() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.warp(block.timestamp + 8 days);
        vm.prank(buyer);
        vm.expectRevert();
        escrowD.refundDeal(dealId);
    }

    /* ================================================================
       MiniApp branches
       ================================================================ */

    function test_cancelMiniApp() public {
        vm.prank(seller);
        uint256 miniId = escrowD.listMiniApp(5 ether, bytes32(uint256(1)));
        vm.prank(seller);
        vm.expectEmit(true, true, true, true);
        emit VaultDeals.MiniAppCancelled(miniId);
        escrowD.cancelMiniApp(miniId);
    }

    function test_cancelMiniApp_Revert_InvalidId() public {
        vm.prank(seller);
        vm.expectRevert("Not found");
        escrowD.cancelMiniApp(999);
    }

    function test_updateMiniApp() public {
        vm.prank(seller);
        uint256 miniId = escrowD.listMiniApp(5 ether, bytes32(uint256(1)));
        bytes32 newHash = bytes32(uint256(0xbeef));
        vm.prank(seller);
        escrowD.updateMiniApp(miniId, 3 ether, newHash);
        uint256 dealId = 1;
        (, , uint256 price, bytes32 hash, , , , , ) = escrowD.deals(dealId);
        assertEq(price, 3 ether);
        assertEq(hash, newHash);
    }

    function test_updateMiniApp_Revert_InvalidId() public {
        vm.prank(seller);
        vm.expectRevert("Not found");
        escrowD.updateMiniApp(999, 3 ether, bytes32(uint256(0xbeef)));
    }

    function test_pauseAndUnpause_Resume() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(admin);
        escrowD.pause();
        assertTrue(escrowD.paused());
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        vm.expectRevert(VaultCore.ContractPaused.selector);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(admin);
        escrowD.unpause();
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
    }

    /* ================================================================
       View helpers
       ================================================================ */

    function test_getOfferLenders() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        address[] memory lenders = escrowNft.getOfferLenders(listingId);
        assertEq(lenders.length, 1);
        assertEq(lenders[0], lender);
    }

    function test_getOfferCount() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        assertEq(escrowNft.getOfferCount(listingId), 0);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        assertEq(escrowNft.getOfferCount(listingId), 1);
    }

    function test_getDeadline() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        uint256 deadline = escrowNft.getDeadline(listingId);
        assertEq(deadline, block.timestamp + 30 days);
    }

    function test_getRepaymentDue() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        (uint256 total, uint256 paid, uint256 remaining) = escrowNft.getRepaymentDue(listingId);
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
        uint256 miniId = escrowD.listMiniApp(5 ether, bytes32(uint256(1)));
        vm.prank(seller);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(seller);
        vm.expectRevert("Seller cannot buy own listing");
        escrowD.buyMiniApp(miniId, 5 ether);
    }

    function test_buyMiniApp_Revert_WrongPrice() public {
        vm.prank(seller);
        uint256 miniId = escrowD.listMiniApp(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 3 ether);
        vm.prank(buyer);
        vm.expectRevert("Amount must equal listing price");
        escrowD.buyMiniApp(miniId, 3 ether);
    }

    function test_buyMiniApp_Revert_AfterFunded() public {
        vm.prank(seller);
        uint256 miniId = escrowD.listMiniApp(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(1, 5 ether); // fund the underlying deal
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        vm.expectRevert(); // deal not at LISTED anymore
        escrowD.buyMiniApp(miniId, 5 ether);
    }

    /* ================================================================
       dispute (loan) — not a party
       ================================================================ */

    function test_dispute_Revert_NotParty() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        address random = makeAddr("random");
        vm.prank(random);
        vm.expectRevert();
        escrowNft.dispute(listingId);
    }

    /* ================================================================
       withdrawOffer — after accept
       ================================================================ */

    function test_withdrawOffer_Revert_AfterAccept() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        vm.prank(lender);
        vm.expectRevert("No deposit for this listing");
        escrowNft.withdrawOffer(listingId);
    }

    function test_withdrawOffer_ClearsOfferStruct() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(lender);
        escrowNft.withdrawOffer(listingId);
        (uint256 oApr, uint256 oTerm) = escrowNft.offers(listingId, lender);
        assertEq(oApr, 0);
        assertEq(oTerm, 0);
    }

    /* ================================================================
       cancelListing event
       ================================================================ */

    function test_cancelListing_Event() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(borrower);
        vm.expectEmit(true, true, true, true);
        emit VaultNFT.Cancelled(listingId);
        escrowNft.cancelListing(listingId);
    }

    /* ================================================================
       admin events
       ================================================================ */

    function test_admin_Events() public {
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit VaultCore.AdminAdded(lender);
        escrowNft.addAdmin(lender);
        vm.prank(lender);
        vm.expectEmit(true, true, true, true);
        emit VaultCore.AdminRemoved(lender);
        escrowNft.removeAdmin(lender);
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit VaultCore.PlatformFeeUpdated(300);
        escrowNft.setPlatformFee(300);
    }

    /* ================================================================
       cancelDeal event
       ================================================================ */

    function test_cancelDeal_Event() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(seller);
        vm.expectEmit(true, true, true, true);
        emit VaultDeals.DealCancelled(dealId);
        escrowD.cancelDeal(dealId);
    }

    /* ================================================================
       fundDeal event
       ================================================================ */

    function test_fundDeal_Event() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowNft), 5 ether);
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit VaultDeals.DealFunded(dealId, buyer, 5 ether);
        escrowD.fundDeal(dealId, 5 ether);
    }

    /* ================================================================
       confirmDelivery event
       ================================================================ */

    function test_confirmDelivery_Event() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrowD.markDelivered(dealId);
        uint256 net = 5 ether - (5 ether * 150 / 10000);
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit VaultDeals.DealConfirmed(dealId, net);
        escrowD.confirmDelivery(dealId);
    }

    /* ================================================================
       dispute/refund deal events
       ================================================================ */

    function test_disputeDeal_Event() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrowD.markDelivered(dealId);
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit VaultDeals.DealDisputed(dealId);
        escrowD.disputeDeal(dealId);
    }

    function test_refundDeal_Event() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.warp(block.timestamp + 8 days);
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit VaultDeals.DealRefunded(dealId);
        escrowD.refundDeal(dealId);
    }

    /* ================================================================
       resolveDeal dust path
       ================================================================ */

    function test_resolveDeal_DustPath() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrowD.markDelivered(dealId);
        vm.prank(buyer);
        escrowD.disputeDeal(dealId);
        vm.prank(admin);
        escrowD.resolveDeal(dealId, 2 ether, 2 ether);
        assertEq(escrowD.dealEscrowBalance(dealId), 0);
    }

    /* ================================================================
       Deal offer system
       ================================================================ */

    function test_submitDealOffer_OK() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 3 ether);
        vm.prank(buyer);
        escrowD.submitDealOffer(dealId, 3 ether);
        assertEq(escrowD.dealOfferDeposits(dealId, buyer), 3 ether);
    }

    function test_withdrawDealOffer_OK() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 3 ether);
        vm.prank(buyer);
        escrowD.submitDealOffer(dealId, 3 ether);
        uint256 balBefore = usdc.balanceOf(buyer);
        vm.prank(buyer);
        escrowD.withdrawDealOffer(dealId);
        assertEq(usdc.balanceOf(buyer), balBefore + 3 ether);
        assertEq(escrowD.dealOfferDeposits(dealId, buyer), 0);
    }

    function test_acceptDealOffer_AutoRefundsOthers() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));

        address buyer2 = makeAddr("buyer2");
        usdc.mint(buyer2, 1_000_000_000 ether);

        // buyer offers 3
        vm.prank(buyer);
        usdc.approve(address(escrowD), 3 ether);
        vm.prank(buyer);
        escrowD.submitDealOffer(dealId, 3 ether);

        // buyer2 offers 4
        vm.prank(buyer2);
        usdc.approve(address(escrowD), 4 ether);
        vm.prank(buyer2);
        escrowD.submitDealOffer(dealId, 4 ether);

        uint256 balB2Before = usdc.balanceOf(buyer2);

        // seller accepts buyer's offer at 3 — buyer2 gets auto-refunded
        vm.prank(seller);
        escrowD.acceptDealOffer(dealId, buyer);

        assertEq(usdc.balanceOf(buyer2), balB2Before + 4 ether);
        assertEq(escrowD.dealOfferDeposits(dealId, buyer2), 0);
        assertEq(escrowD.dealEscrowBalance(dealId), 3 ether);
    }

    function test_acceptDealOffer_StageBecomesFunded() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 4 ether);
        vm.prank(buyer);
        escrowD.submitDealOffer(dealId, 4 ether);
        vm.prank(seller);
        escrowD.acceptDealOffer(dealId, buyer);
        (, , uint256 price, , uint256 deadline, , VaultDeals.DealStage stage, , ) = escrowD.deals(dealId);
        assertEq(price, 4 ether);
        assertEq(uint256(stage), uint256(VaultDeals.DealStage.FUNDED));
        assertGt(deadline, 0);
    }

    function test_getDealOfferCount() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        assertEq(escrowD.getDealOfferCount(dealId), 0);

        vm.prank(buyer);
        usdc.approve(address(escrowD), 3 ether);
        vm.prank(buyer);
        escrowD.submitDealOffer(dealId, 3 ether);
        assertEq(escrowD.getDealOfferCount(dealId), 1);
    }

    function test_getDealOfferBuyers() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 3 ether);
        vm.prank(buyer);
        escrowD.submitDealOffer(dealId, 3 ether);
        address[] memory buyers = escrowD.getDealOfferBuyers(dealId);
        assertEq(buyers.length, 1);
        assertEq(buyers[0], buyer);
    }

    /* ================================================================
       updateOffer — all three branches
       ================================================================ */

    function test_updateOffer_IncreaseDeposit() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 5 ether, 1420, 30);
        uint256 balBefore = usdc.balanceOf(lender);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 5 ether);
        vm.prank(lender);
        escrowNft.updateOffer(listingId, 10 ether, 2000, 60);
        assertEq(escrowNft.lenderDeposits(listingId, lender), 10 ether);
        assertEq(escrowNft.listingEscrowBalance(listingId), 10 ether);
        assertLt(usdc.balanceOf(lender), balBefore);
        (uint256 oApr, uint256 oTerm) = escrowNft.offers(listingId, lender);
        assertEq(oApr, 2000);
        assertEq(oTerm, 60);
    }

    function test_updateOffer_DecreaseDeposit() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        uint256 balBefore = usdc.balanceOf(lender);
        vm.prank(lender);
        escrowNft.updateOffer(listingId, 3 ether, 1000, 15);
        assertEq(escrowNft.lenderDeposits(listingId, lender), 3 ether);
        assertEq(escrowNft.listingEscrowBalance(listingId), 3 ether);
        assertEq(usdc.balanceOf(lender), balBefore + 7 ether);
        (uint256 oApr, uint256 oTerm) = escrowNft.offers(listingId, lender);
        assertEq(oApr, 1000);
        assertEq(oTerm, 15);
    }

    function test_updateOffer_SameAmount_ChangeTerms() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        vm.prank(lender);
        escrowNft.updateOffer(listingId, 10 ether, 5000, 365);
        assertEq(escrowNft.lenderDeposits(listingId, lender), 10 ether);
        assertEq(escrowNft.listingEscrowBalance(listingId), 10 ether);
        (uint256 oApr, uint256 oTerm) = escrowNft.offers(listingId, lender);
        assertEq(oApr, 5000);
        assertEq(oTerm, 365);
    }

    function test_updateOffer_Revert_NoOffer() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        vm.expectRevert("No offer to update");
        escrowNft.updateOffer(listingId, 5 ether, 1420, 30);
    }

    /* ================================================================
       setTreasury
       ================================================================ */

    function test_setTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit VaultCore.TreasurySet(admin, newTreasury);
        escrowNft.setTreasury(newTreasury);
        assertEq(escrowNft.treasury(), newTreasury);
    }

    /* ================================================================
       cancelListing — with outstanding offers (refund loop body)
       ================================================================ */

    function test_cancelListing_WithOffers_RefundsThem() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);

        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 8 ether, 1420, 30);

        vm.prank(lender2);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender2);
        escrowNft.submitOffer(listingId, 5 ether, 1420, 30);

        assertEq(escrowNft.listingEscrowBalance(listingId), 13 ether);

        uint256 bal1Before = usdc.balanceOf(lender);
        uint256 bal2Before = usdc.balanceOf(lender2);

        vm.prank(borrower);
        escrowNft.cancelListing(listingId);

        assertEq(escrowNft.listingEscrowBalance(listingId), 0);
        assertEq(usdc.balanceOf(lender), bal1Before + 8 ether);
        assertEq(usdc.balanceOf(lender2), bal2Before + 5 ether);
        assertEq(nft.ownerOf(tokenId), borrower);
    }

    /* ================================================================
       cancelDeal — with outstanding deal offers (refund loop body)
       ================================================================ */

    function test_cancelDeal_WithOffers_RefundsThem() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));

        vm.prank(buyer);
        usdc.approve(address(escrowD), 3 ether);
        vm.prank(buyer);
        escrowD.submitDealOffer(dealId, 3 ether);

        address buyer2 = makeAddr("buyer2");
        usdc.mint(buyer2, 1_000_000_000 ether);
        vm.prank(buyer2);
        usdc.approve(address(escrowD), 4 ether);
        vm.prank(buyer2);
        escrowD.submitDealOffer(dealId, 4 ether);

        uint256 balBefore = usdc.balanceOf(buyer);
        uint256 bal2Before = usdc.balanceOf(buyer2);

        vm.prank(seller);
        escrowD.cancelDeal(dealId);

        assertEq(usdc.balanceOf(buyer), balBefore + 3 ether);
        assertEq(usdc.balanceOf(buyer2), bal2Before + 4 ether);
        assertEq(escrowD.getDealOfferCount(dealId), 0);
    }

    /* ================================================================
       seller disputeDeal
       ================================================================ */

    function test_sellerDisputeDeal_AtDelivered() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrowD.markDelivered(dealId);

        vm.prank(seller);
        vm.expectEmit(true, true, true, true);
        emit VaultDeals.DealDisputed(dealId);
        escrowD.disputeDeal(dealId);

        (, , , , , , VaultDeals.DealStage stage, , ) = escrowD.deals(dealId);
        assertEq(uint256(stage), uint256(VaultDeals.DealStage.DISPUTED));
    }

    function test_disputeDeal_AtFunded() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);

        vm.prank(seller);
        escrowD.disputeDeal(dealId);

        (, , , , , , VaultDeals.DealStage stage, , ) = escrowD.deals(dealId);
        assertEq(uint256(stage), uint256(VaultDeals.DealStage.DISPUTED));
    }

    function test_disputeDeal_Revert_AfterConfirmed() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrowD.markDelivered(dealId);
        vm.prank(buyer);
        escrowD.confirmDelivery(dealId);

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(VaultDeals.InvalidDealStage.selector, VaultDeals.DealStage.CONFIRMED, VaultDeals.DealStage.DELIVERED)
        );
        escrowD.disputeDeal(dealId);
    }

    /* ================================================================
       markDelivered — deadline passed revert
       ================================================================ */

    function test_markDelivered_Revert_DeadlinePassed() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        vm.warp(block.timestamp + 8 days);
        vm.prank(seller);
        vm.expectRevert("Deadline passed");
        escrowD.markDelivered(dealId);
    }
}
