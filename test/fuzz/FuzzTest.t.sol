// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../../contracts/VaultEscrow.sol";

/// @notice Fuzz & property-based tests
contract FuzzTest is Test {
    VaultEscrow public escrow;
    MockERC721 public nft;

    address admin = makeAddr("admin");
    address borrower = makeAddr("borrower");
    address lender = makeAddr("lender");

    function setUp() public {
        vm.prank(admin);
        escrow = new VaultEscrow(150);
        nft = new MockERC721();
        vm.deal(lender, 1000 ether);
        vm.deal(borrower, 1000 ether);
    }

    // ═══════════════════════════════════════════════════════════
    //  FUZZ: repayPartial amounts
    // ═══════════════════════════════════════════════════════════

    function testFuzz_repayPartial_Invariant(uint256 partialAmount) public {
        // Setup active loan
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);

        uint256 loanAmount = 10 ether;
        uint256 loanApr = 1420;
        uint256 loanTerm = 30;

        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, loanAmount, loanApr, loanTerm);

        vm.prank(lender);
        escrow.submitOffer{value: loanAmount}(listingId, loanAmount, loanApr, loanTerm);

        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, loanAmount, loanApr, loanTerm);

        uint256 interest = loanAmount * loanApr * loanTerm / 3650000;
        uint256 totalDue = loanAmount + interest;

        // Bound to reasonable range (1 wei to 2x totalDue)
        partialAmount = bound(partialAmount, 1, totalDue * 2);

        vm.prank(borrower);
        if (partialAmount > totalDue) {
            // Overpayment should revert with repayPartial
            vm.expectRevert("Overpayment - use repay() to close");
            escrow.repayPartial{value: partialAmount}(listingId);
        } else {
            escrow.repayPartial{value: partialAmount}(listingId);

            (, uint256 paid, uint256 remaining) = escrow.getRepaymentDue(listingId);
            assertEq(paid, partialAmount);

            if (paid >= totalDue) {
                // Should have auto-closed
                (,,,,,,,,,,,, VaultEscrow.Stage _s) = escrow.listings(listingId);
                assertEq(uint8(_s), uint8(VaultEscrow.Stage.REPAID));
            } else {
                assertEq(remaining, totalDue - partialAmount);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  FUZZ: loan math — interest never exceeds totalDue
    // ═══════════════════════════════════════════════════════════

    function testFuzz_InterestMath_NoOverflow(uint256 amount, uint256 apr, uint256 term) public {
        amount = bound(amount, 0.1 ether, 1000 ether);
        apr = bound(apr, 1, 10000); // up to 100%
        term = bound(term, 1, 365);

        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);

        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, amount, apr, term);
        vm.prank(lender);
        escrow.submitOffer{value: amount}(listingId, amount, apr, term);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, amount, apr, term);

        (uint256 total, , ) = escrow.getRepaymentDue(listingId);
        // Total should never be less than principal
        assertGe(total, amount);
        // Interest = total - amount should not overflow
        uint256 interest = total - amount;
        uint256 expectedInterest = amount * apr * term / 3650000;
        assertEq(interest, expectedInterest);
    }

    // ═══════════════════════════════════════════════════════════
    //  FUZZ: deal escrow amounts — balance always matches
    // ═══════════════════════════════════════════════════════════

    function testFuzz_DealEscrow_BalanceInvariant(uint256 price) public {
        price = bound(price, 0.01 ether, 1000 ether);

        address seller = makeAddr("seller");
        address buyer = makeAddr("buyer");
        vm.deal(buyer, 2000 ether);

        vm.prank(seller);
        uint256 dealId = escrow.listDeal(price, bytes32(uint256(1)));

        vm.prank(admin);
        escrow.verifyDeal(dealId);

        // Balance before funding
        assertEq(escrow.dealEscrowBalance(dealId), 0);

        vm.prank(buyer);
        escrow.fundDeal{value: price}(dealId);

        // Balance should match price after funding
        assertEq(escrow.dealEscrowBalance(dealId), price);

        vm.prank(seller);
        escrow.markDelivered(dealId);

        vm.prank(buyer);
        escrow.confirmDelivery(dealId);

        // Balance should be 0 after confirmation
        assertEq(escrow.dealEscrowBalance(dealId), 0);
    }

    // ═══════════════════════════════════════════════════════════
    //  FUZZ: listingEscrowBalance tracks correctly with multiple offers
    // ═══════════════════════════════════════════════════════════

    function testFuzz_ListingEscrow_BalanceTracking(uint256 offer1, uint256 offer2) public {
        offer1 = bound(offer1, 1 ether, 100 ether);
        offer2 = bound(offer2, 1 ether, 100 ether);

        address l1 = makeAddr("l1");
        address l2 = makeAddr("l2");
        vm.deal(l1, 1000 ether);
        vm.deal(l2, 1000 ether);

        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);

        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 1 ether, 1420, 30);

        vm.prank(l1);
        escrow.submitOffer{value: offer1}(listingId, offer1, 1420, 30);

        vm.prank(l2);
        escrow.submitOffer{value: offer2}(listingId, offer2, 1420, 30);

        assertEq(escrow.listingEscrowBalance(listingId), offer1 + offer2);

        // Withdraw one
        vm.prank(l1);
        escrow.withdrawOffer(listingId);

        assertEq(escrow.listingEscrowBalance(listingId), offer2);

        // Withdraw other
        vm.prank(l2);
        escrow.withdrawOffer(listingId);

        assertEq(escrow.listingEscrowBalance(listingId), 0);
    }

    // ═══════════════════════════════════════════════════════════
    //  FUZZ: offer rejection — APR/term mismatch always caught
    // ═══════════════════════════════════════════════════════════

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
        escrow.submitOffer{value: 10 ether}(listingId, 10 ether, offeredApr, offeredTerm);

        if (offeredApr != acceptedApr || offeredTerm != acceptedTerm) {
            vm.prank(borrower);
            vm.expectRevert(VaultEscrow.OfferMismatch.selector);
            escrow.acceptOffer(listingId, lender, 10 ether, acceptedApr, acceptedTerm);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  INVARIANT: platform fee never exceeds 5%
    // ═══════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════
    //  INVARIANT: dealCount and listingCount never decrease
    // ═══════════════════════════════════════════════════════════

    function testFuzz_CounterMonotonic(uint256 nums) public {
        // Limit to reasonable range
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

    // ═══════════════════════════════════════════════════════════
    //  EDGE CASE: zero interest loan
    // ═══════════════════════════════════════════════════════════

    function test_ZeroAPR_Loan() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);

        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 0, 30); // 0% APR

        vm.prank(lender);
        escrow.submitOffer{value: 10 ether}(listingId, 10 ether, 0, 30);

        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 0, 30);

        (uint256 total, , ) = escrow.getRepaymentDue(listingId);
        assertEq(total, 10 ether); // principal only, no interest

        vm.prank(borrower);
        escrow.repay{value: 10 ether}(listingId);

        assertEq(nft.ownerOf(tokenId), borrower);
    }

    // ═══════════════════════════════════════════════════════════
    //  EDGE CASE: 365-day max loan
    // ═══════════════════════════════════════════════════════════

    function test_MaxTermLoan() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);

        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 5 ether, 5000, 365); // 50% APR, 365 days

        vm.prank(lender);
        escrow.submitOffer{value: 5 ether}(listingId, 5 ether, 5000, 365);

        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 5 ether, 5000, 365);

        (uint256 total, , ) = escrow.getRepaymentDue(listingId);
        // interest = 5e18 * 5000 * 365 / 3650000 = 2.5 ether
        uint256 expectedInterest = 5 ether * 5000 * 365 / 3650000;
        assertEq(total, 5 ether + expectedInterest);
    }
}
