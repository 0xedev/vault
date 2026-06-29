// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../mocks/MockERC20.sol";
import "../../contracts/VaultEscrow.sol";

contract FuzzTest is Test {
    VaultEscrow public escrow;
    MockERC721 public nft;
    MockERC20 public usdc;

    address admin = makeAddr("admin");
    address borrower = makeAddr("borrower");
    address lender = makeAddr("lender");

    function setUp() public {
        usdc = new MockERC20();
        vm.prank(admin);
        escrow = new VaultEscrow(address(usdc), 150);
        nft = new MockERC721();
        usdc.mint(lender, 1_000_000_000 ether);
        usdc.mint(borrower, 1_000_000_000 ether);
    }

    /* ================================================================
       FUZZ: repayPartial amounts
       ================================================================ */

    function testFuzz_repayPartial_Invariant(uint256 partialAmount) public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);

        uint256 loanAmount = 10 ether;
        uint256 loanApr = 1420;
        uint256 loanTerm = 30;

        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, loanAmount, loanApr, loanTerm);

        vm.prank(lender);
        usdc.approve(address(escrow), loanAmount);
        vm.prank(lender);
        escrow.submitOffer(listingId, loanAmount, loanApr, loanTerm);

        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, loanAmount, loanApr, loanTerm);

        uint256 interest = loanAmount * loanApr * loanTerm / 3650000;
        uint256 totalDue = loanAmount + interest;

        partialAmount = bound(partialAmount, 1, totalDue * 2);

        vm.prank(borrower);
        usdc.approve(address(escrow), partialAmount);
        vm.prank(borrower);
        if (partialAmount > totalDue) {
            vm.expectRevert("Overpayment - use repay() to close");
            escrow.repayPartial(listingId, partialAmount);
        } else {
            escrow.repayPartial(listingId, partialAmount);
            (, uint256 paid, uint256 remaining) = escrow.getRepaymentDue(listingId);
            assertEq(paid, partialAmount);
            if (paid >= totalDue) {
                (,,,,,,,,,,,, VaultEscrow.Stage _s) = escrow.listings(listingId);
                assertEq(uint8(_s), uint8(VaultEscrow.Stage.REPAID));
            } else {
                assertEq(remaining, totalDue - partialAmount);
            }
        }
    }

    /* ================================================================
       FUZZ: interest math
       ================================================================ */

    function testFuzz_InterestMath_NoOverflow(uint256 amount, uint256 apr, uint256 term) public {
        amount = bound(amount, 0.1 ether, 1000 ether);
        apr = bound(apr, 1, 10000);
        term = bound(term, 1, 365);

        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);

        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, amount, apr, term);

        vm.prank(lender);
        usdc.approve(address(escrow), amount);
        vm.prank(lender);
        escrow.submitOffer(listingId, amount, apr, term);

        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, amount, apr, term);

        (uint256 total, , ) = escrow.getRepaymentDue(listingId);
        assertGe(total, amount);
        uint256 interest = total - amount;
        uint256 expectedInterest = amount * apr * term / 3650000;
        assertEq(interest, expectedInterest);
    }

    /* ================================================================
       FUZZ: deal escrow balance invariant
       ================================================================ */

    function testFuzz_DealEscrow_BalanceInvariant(uint256 price) public {
        price = bound(price, 0.01 ether, 1000 ether);

        address s = makeAddr("seller");
        address b = makeAddr("buyer");
        usdc.mint(b, 1_000_000_000 ether);

        vm.prank(s);
        uint256 dealId = escrow.listDeal(price, bytes32(uint256(1)));

        assertEq(escrow.dealEscrowBalance(dealId), 0);

        vm.prank(b);
        usdc.approve(address(escrow), price);
        vm.prank(b);
        escrow.fundDeal(dealId, price);

        assertEq(escrow.dealEscrowBalance(dealId), price);

        vm.prank(s);
        escrow.markDelivered(dealId);

        vm.prank(b);
        escrow.confirmDelivery(dealId);

        assertEq(escrow.dealEscrowBalance(dealId), 0);
    }

    /* ================================================================
       FUZZ: listingEscrowBalance tracking
       ================================================================ */

    function testFuzz_ListingEscrow_BalanceTracking(uint256 offer1, uint256 offer2) public {
        offer1 = bound(offer1, 1 ether, 100 ether);
        offer2 = bound(offer2, 1 ether, 100 ether);

        address l1 = makeAddr("l1");
        address l2 = makeAddr("l2");
        usdc.mint(l1, 1_000_000_000 ether);
        usdc.mint(l2, 1_000_000_000 ether);

        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 1 ether, 1420, 30);

        vm.prank(l1);
        usdc.approve(address(escrow), offer1);
        vm.prank(l1);
        escrow.submitOffer(listingId, offer1, 1420, 30);

        vm.prank(l2);
        usdc.approve(address(escrow), offer2);
        vm.prank(l2);
        escrow.submitOffer(listingId, offer2, 1420, 30);

        assertEq(escrow.listingEscrowBalance(listingId), offer1 + offer2);

        vm.prank(l1);
        escrow.withdrawOffer(listingId);
        assertEq(escrow.listingEscrowBalance(listingId), offer2);

        vm.prank(l2);
        escrow.withdrawOffer(listingId);
        assertEq(escrow.listingEscrowBalance(listingId), 0);
    }

    /* ================================================================
       FUZZ: offer mismatch
       ================================================================ */

    function testFuzz_OfferMismatch_Reverted(uint256 offeredApr, uint256 offeredTerm, uint256 acceptedApr, uint256 acceptedTerm) public {
        offeredApr = bound(offeredApr, 1, 10000);
        offeredTerm = bound(offeredTerm, 1, 365);
        acceptedApr = bound(acceptedApr, 1, 10000);
        acceptedTerm = bound(acceptedTerm, 1, 365);

        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, offeredApr, offeredTerm);

        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, offeredApr, offeredTerm);

        if (offeredApr != acceptedApr || offeredTerm != acceptedTerm) {
            vm.prank(borrower);
            vm.expectRevert(VaultEscrow.OfferMismatch.selector);
            escrow.acceptOffer(listingId, lender, 10 ether, acceptedApr, acceptedTerm);
        }
    }

    /* ================================================================
       FUZZ: platform fee limit
       ================================================================ */

    function testFuzz_PlatformFee_Limit(uint256 feeBps) public {
        feeBps = bound(feeBps, 0, 10000);
        if (feeBps > 500) {
            vm.prank(admin);
            vm.expectRevert("Max 5%");
            escrow.setPlatformFee(feeBps);
        } else {
            vm.prank(admin);
            escrow.setPlatformFee(feeBps);
            assertEq(escrow.platformFeeBps(), feeBps);
        }
    }

    /* ================================================================
       INVARIANT: dealCount monotonic
       ================================================================ */

    function testFuzz_CounterMonotonic(uint256 nums) public {
        nums = bound(nums, 1, 20);
        address[] memory sellers = new address[](nums);
        for (uint256 i = 0; i < nums; i++) {
            sellers[i] = makeAddr(string(abi.encodePacked("seller", i)));
        }
        uint256 startDealCount = escrow.dealCount();
        for (uint256 i = 0; i < nums; i++) {
            vm.prank(sellers[i]);
            escrow.listDeal(1 ether, bytes32(uint256(i + 1)));
        }
        assertEq(escrow.dealCount(), startDealCount + nums);
    }

    /* ================================================================
       EDGE: zero interest
       ================================================================ */

    function test_ZeroAPR_Loan() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 0, 30);

        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 0, 30);

        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 0, 30);

        (uint256 total, , ) = escrow.getRepaymentDue(listingId);
        assertEq(total, 10 ether);

        vm.prank(borrower);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(borrower);
        escrow.repay(listingId, 10 ether);

        assertEq(nft.ownerOf(tokenId), borrower);
    }

    /* ================================================================
       EDGE: 365-day max loan
       ================================================================ */

    function test_MaxTermLoan() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 5 ether, 5000, 365);

        vm.prank(lender);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 5 ether, 5000, 365);

        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 5 ether, 5000, 365);

        (uint256 total, , ) = escrow.getRepaymentDue(listingId);
        uint256 expectedInterest = 5 ether * 5000 * 365 / 3650000;
        assertEq(total, 5 ether + expectedInterest);
    }
}
