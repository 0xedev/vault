// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../mocks/MockERC20.sol";
import "../../contracts/VaultNFT.sol";
import "../../contracts/VaultDeals.sol";

/// @notice Integration tests: full end-to-end flows across both escrow systems
contract IntegrationTest is Test {
    VaultNFT public escrowNft;
    VaultDeals public escrowD;
    MockERC721 public nft;
    MockERC20 public usdc;

    address admin = makeAddr("admin");
    address borrower = makeAddr("borrower");
    address lender = makeAddr("lender");
    address buyer = makeAddr("buyer");
    address seller = makeAddr("seller");

    function setUp() public {
        usdc = new MockERC20();
        vm.prank(admin);
        escrowNft = new VaultNFT(address(usdc), 150, admin);
        vm.prank(admin);
        escrowD = new VaultDeals(address(usdc), 150, admin);
        nft = new MockERC721();
        usdc.mint(lender, 1_000_000_000 ether);
        usdc.mint(borrower, 1_000_000_000 ether);
        usdc.mint(buyer, 1_000_000_000 ether);
    }

    /// @notice Full NFT loan lifecycle
    function test_FullLoanHappyPath() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        assertEq(nft.ownerOf(tokenId), borrower);

        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        assertEq(nft.ownerOf(tokenId), address(escrowNft));

        // Lender offers
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
        assertEq(escrowNft.listingEscrowBalance(listingId), 10 ether);

        // Borrower accepts
        uint256 borrowerBalBefore = usdc.balanceOf(borrower);
        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        assertGt(usdc.balanceOf(borrower), borrowerBalBefore);

        // Borrower repays
        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;
        vm.prank(borrower);
        usdc.approve(address(escrowNft), totalDue);
        vm.prank(borrower);
        escrowNft.repay(listingId, totalDue);

        assertEq(nft.ownerOf(tokenId), borrower);
    }

    /// @notice Deal lifecycle with dispute
    function test_FullDealDisputeFlow() public {
        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(0xabc)));

        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
        assertEq(escrowD.dealEscrowBalance(dealId), 5 ether);

        vm.prank(seller);
        escrowD.markDelivered(dealId);

        vm.prank(buyer);
        escrowD.disputeDeal(dealId);

        uint256 sellerBalBefore = usdc.balanceOf(seller);
        uint256 buyerBalBefore = usdc.balanceOf(buyer);

        vm.prank(admin);
        escrowD.resolveDeal(dealId, 2 ether, 3 ether);

        assertEq(usdc.balanceOf(buyer), buyerBalBefore + 2 ether);
        assertGt(usdc.balanceOf(seller), sellerBalBefore);
        assertEq(escrowD.dealEscrowBalance(dealId), 0);
    }

    /// @notice Concurrent loans + deals
    function test_ConcurrentLoansAndDeals() public {
        // Loan A
        uint256 tokenA = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenA);
        vm.prank(borrower);
        uint256 loanA = escrowNft.listNFT(address(nft), tokenA, 5 ether, 1000, 60);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 5 ether);
        vm.prank(lender);
        escrowNft.submitOffer(loanA, 5 ether, 1000, 60);

        // Deal D
        vm.prank(seller);
        uint256 dealD = escrowD.listDeal(3 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrowD), 3 ether);
        vm.prank(buyer);
        escrowD.fundDeal(dealD, 3 ether);

        // Loan B
        uint256 tokenB = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenB);
        vm.prank(borrower);
        uint256 loanB = escrowNft.listNFT(address(nft), tokenB, 8 ether, 2000, 90);
        address lenderB = makeAddr("lenderB");
        usdc.mint(lenderB, 1_000_000_000 ether);
        vm.prank(lenderB);
        usdc.approve(address(escrowNft), 8 ether);
        vm.prank(lenderB);
        escrowNft.submitOffer(loanB, 8 ether, 2000, 90);

        assertEq(escrowNft.listingEscrowBalance(loanA), 5 ether);
        assertEq(escrowNft.listingEscrowBalance(loanB), 8 ether);
        assertEq(escrowD.dealEscrowBalance(dealD), 3 ether);

        vm.prank(borrower);
        escrowNft.acceptOffer(loanA, lender, 5 ether, 1000, 60);

        uint256 interestA = uint256(5 ether * 1000 * 60) / 3650000;
        vm.prank(borrower);
        usdc.approve(address(escrowNft), 5 ether + interestA);
        vm.prank(borrower);
        escrowNft.repay(loanA, 5 ether + interestA);

        assertEq(nft.ownerOf(tokenA), borrower);
        assertEq(escrowNft.listingEscrowBalance(loanB), 8 ether);
        assertEq(escrowD.dealEscrowBalance(dealD), 3 ether);
    }

    /// @notice Pause blocks both systems
    function test_PauseBlocksBothSystems() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);

        vm.prank(seller);
        uint256 dealId = escrowD.listDeal(5 ether, bytes32(uint256(1)));

        vm.startPrank(admin);
        escrowD.pause();
        escrowNft.pause();
        vm.stopPrank();
        assertTrue(escrowD.paused());
        assertTrue(escrowNft.paused());

        vm.prank(borrower);
        vm.expectRevert(VaultCore.ContractPaused.selector);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        vm.prank(buyer);
        usdc.approve(address(escrowD), 5 ether);
        vm.prank(buyer);
        vm.expectRevert(VaultCore.ContractPaused.selector);
        escrowD.fundDeal(dealId, 5 ether);

        vm.startPrank(admin);
        escrowD.unpause();
        escrowNft.unpause();
        vm.stopPrank();
        assertFalse(escrowD.paused());
        assertFalse(escrowNft.paused());

        vm.prank(borrower);
        escrowNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        vm.prank(buyer);
        escrowD.fundDeal(dealId, 5 ether);
    }

    /// @notice Admin transfer lockout
    function test_AdminTransfer_Lockout() public {
        address newAdmin = makeAddr("newAdmin");

        vm.prank(admin);
        escrowD.addAdmin(newAdmin);

        // Old admin still has access (both are admins)
        vm.prank(admin);
        escrowD.setPlatformFee(100);

        // New admin can also act
        vm.prank(newAdmin);
        escrowD.setPlatformFee(200);

        // Remove old admin
        vm.prank(admin);
        escrowD.removeAdmin(admin);

        // Old admin now locked out
        vm.prank(admin);
        vm.expectRevert(VaultCore.NotAdmin.selector);
        escrowD.setPlatformFee(100);
    }
}
