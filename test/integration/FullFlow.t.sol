// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../../contracts/VaultEscrow.sol";

/// @notice Integration tests: full end-to-end flows across both escrow systems
contract IntegrationTest is Test {
    VaultEscrow public escrow;
    MockERC721 public nft;

    address admin = makeAddr("admin");
    address borrower = makeAddr("borrower");
    address lender = makeAddr("lender");
    address buyer = makeAddr("buyer");
    address seller = makeAddr("seller");

    function setUp() public {
        vm.prank(admin);
        escrow = new VaultEscrow(150);
        nft = new MockERC721();
        vm.deal(lender, 100 ether);
        vm.deal(borrower, 50 ether);
        vm.deal(buyer, 100 ether);
    }

    /// @notice Full NFT loan lifecycle: list → offer → accept → repay → NFT returned
    function test_FullLoanHappyPath() public {
        // 1. Borrower lists NFT
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        assertEq(nft.ownerOf(tokenId), borrower); // still owns

        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        assertEq(nft.ownerOf(tokenId), address(escrow)); // NFT in escrow

        // 2. Lender submits offer
        vm.prank(lender);
        escrow.submitOffer{value: 10 ether}(listingId, 10 ether, 1420, 30);
        assertEq(escrow.listingEscrowBalance(listingId), 10 ether);

        // 3. Borrower accepts
        uint256 borrowerBalBefore = borrower.balance;
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        assertGt(borrower.balance, borrowerBalBefore); // got ETH

        // 4. Borrower repays
        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;
        vm.deal(borrower, 100 ether);
        vm.prank(borrower);
        escrow.repay{value: totalDue}(listingId);

        // 5. NFT returned
        assertEq(nft.ownerOf(tokenId), borrower);
    }

    /// @notice Deal lifecycle with dispute: list → fund → deliver → dispute → admin splits
    function test_FullDealDisputeFlow() public {
        // 1. Seller lists
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(0xabc)));

        // 2. Admin verifies
        vm.prank(admin);
        escrow.verifyDeal(dealId);

        // 3. Buyer funds
        vm.prank(buyer);
        escrow.fundDeal{value: 5 ether}(dealId);
        assertEq(escrow.dealEscrowBalance(dealId), 5 ether);

        // 4. Seller marks delivered
        vm.prank(seller);
        escrow.markDelivered(dealId);

        // 5. Buyer disputes (claiming partial delivery)
        vm.prank(buyer);
        escrow.disputeDeal(dealId);

        // 6. Admin resolves: 2 ETH to buyer, 3 ETH to seller
        uint256 sellerBalBefore = seller.balance;
        uint256 buyerBalBefore = buyer.balance;

        vm.prank(admin);
        escrow.resolveDeal(dealId, 2 ether, 3 ether);

        assertEq(buyer.balance, buyerBalBefore + 2 ether);
        assertGt(seller.balance, sellerBalBefore);
        assertEq(escrow.dealEscrowBalance(dealId), 0);
    }

    /// @notice Multiple loans + deals concurrently — no balance contamination
    function test_ConcurrentLoansAndDeals() public {
        // --- Loan A ---
        uint256 tokenA = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenA);
        vm.prank(borrower);
        uint256 loanA = escrow.listNFT(address(nft), tokenA, 5 ether, 1000, 60);

        vm.prank(lender);
        escrow.submitOffer{value: 5 ether}(loanA, 5 ether, 1000, 60);

        // --- Deal D ---
        vm.prank(seller);
        uint256 dealD = escrow.listDeal(3 ether, bytes32(uint256(1)));
        vm.prank(admin);
        escrow.verifyDeal(dealD);
        vm.prank(buyer);
        escrow.fundDeal{value: 3 ether}(dealD);

        // --- Loan B ---
        uint256 tokenB = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenB);
        vm.prank(borrower);
        uint256 loanB = escrow.listNFT(address(nft), tokenB, 8 ether, 2000, 90);

        // Different lender for loan B
        address lenderB = makeAddr("lenderB");
        vm.deal(lenderB, 100 ether);
        vm.prank(lenderB);
        escrow.submitOffer{value: 8 ether}(loanB, 8 ether, 2000, 90);

        // Balances should be independent
        assertEq(escrow.listingEscrowBalance(loanA), 5 ether);
        assertEq(escrow.listingEscrowBalance(loanB), 8 ether);
        assertEq(escrow.dealEscrowBalance(dealD), 3 ether);

        // Complete loan A — should not affect other entities
        vm.prank(borrower);
        escrow.acceptOffer(loanA, lender, 5 ether, 1000, 60);

        uint256 interestA = uint256(5 ether * 1000 * 60) / 3650000;
        vm.deal(borrower, 100 ether);
        vm.prank(borrower);
        escrow.repay{value: 5 ether + interestA}(loanA);

        assertEq(nft.ownerOf(tokenA), borrower);
        assertEq(escrow.listingEscrowBalance(loanB), 8 ether); // unaffected
        assertEq(escrow.dealEscrowBalance(dealD), 3 ether);    // unaffected
    }

    /// @notice Pause blocks both systems, unpause restores
    function test_PauseBlocksBothSystems() public {
        // Setup loan
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        escrow.submitOffer{value: 10 ether}(listingId, 10 ether, 1420, 30);

        // Setup deal
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(admin);
        escrow.verifyDeal(dealId);

        // Pause
        vm.prank(admin);
        escrow.pause();
        assertTrue(escrow.paused());

        // Both systems blocked
        vm.prank(borrower);
        vm.expectRevert(VaultEscrow.ContractPaused.selector);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        vm.prank(buyer);
        vm.expectRevert(VaultEscrow.ContractPaused.selector);
        escrow.fundDeal{value: 5 ether}(dealId);

        // Unpause
        vm.prank(admin);
        escrow.unpause();
        assertFalse(escrow.paused());

        // Both work again
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        vm.prank(buyer);
        escrow.fundDeal{value: 5 ether}(dealId);
    }

    /// @notice Admin transfer then old admin is locked out
    function test_AdminTransfer_Lockout() public {
        address newAdmin = makeAddr("newAdmin");

        // Setup
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(1 ether, bytes32(uint256(1)));

        // Transfer admin
        vm.prank(admin);
        escrow.transferAdmin(newAdmin);

        // Old admin locked out
        vm.prank(admin);
        vm.expectRevert(VaultEscrow.NotAdmin.selector);
        escrow.verifyDeal(dealId);

        // New admin can act
        vm.prank(newAdmin);
        escrow.verifyDeal(dealId);
    }
}
