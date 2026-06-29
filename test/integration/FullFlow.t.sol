// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../mocks/MockERC20.sol";
import "../../contracts/VaultEscrow.sol";

/// @notice Integration tests: full end-to-end flows across both escrow systems
contract IntegrationTest is Test {
    VaultEscrow public escrow;
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
        escrow = new VaultEscrow(address(usdc), 150);
        nft = new MockERC721();
        usdc.mint(lender, 1_000_000_000 ether);
        usdc.mint(borrower, 1_000_000_000 ether);
        usdc.mint(buyer, 1_000_000_000 ether);
    }

    /// @notice Full NFT loan lifecycle
    function test_FullLoanHappyPath() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        assertEq(nft.ownerOf(tokenId), borrower);

        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        assertEq(nft.ownerOf(tokenId), address(escrow));

        // Lender offers
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);
        assertEq(escrow.listingEscrowBalance(listingId), 10 ether);

        // Borrower accepts
        uint256 borrowerBalBefore = usdc.balanceOf(borrower);
        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);
        assertGt(usdc.balanceOf(borrower), borrowerBalBefore);

        // Borrower repays
        uint256 interest = uint256(10 ether * 1420 * 30) / 3650000;
        uint256 totalDue = 10 ether + interest;
        vm.prank(borrower);
        usdc.approve(address(escrow), totalDue);
        vm.prank(borrower);
        escrow.repay(listingId, totalDue);

        assertEq(nft.ownerOf(tokenId), borrower);
    }

    /// @notice Deal lifecycle with dispute
    function test_FullDealDisputeFlow() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(0xabc)));

        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        assertEq(escrow.dealEscrowBalance(dealId), 5 ether);

        vm.prank(seller);
        escrow.markDelivered(dealId);

        vm.prank(buyer);
        escrow.disputeDeal(dealId);

        uint256 sellerBalBefore = usdc.balanceOf(seller);
        uint256 buyerBalBefore = usdc.balanceOf(buyer);

        vm.prank(admin);
        escrow.resolveDeal(dealId, 2 ether, 3 ether);

        assertEq(usdc.balanceOf(buyer), buyerBalBefore + 2 ether);
        assertGt(usdc.balanceOf(seller), sellerBalBefore);
        assertEq(escrow.dealEscrowBalance(dealId), 0);
    }

    /// @notice Concurrent loans + deals
    function test_ConcurrentLoansAndDeals() public {
        // Loan A
        uint256 tokenA = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenA);
        vm.prank(borrower);
        uint256 loanA = escrow.listNFT(address(nft), tokenA, 5 ether, 1000, 60);
        vm.prank(lender);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(lender);
        escrow.submitOffer(loanA, 5 ether, 1000, 60);

        // Deal D
        vm.prank(seller);
        uint256 dealD = escrow.listDeal(3 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 3 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealD, 3 ether);

        // Loan B
        uint256 tokenB = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenB);
        vm.prank(borrower);
        uint256 loanB = escrow.listNFT(address(nft), tokenB, 8 ether, 2000, 90);
        address lenderB = makeAddr("lenderB");
        usdc.mint(lenderB, 1_000_000_000 ether);
        vm.prank(lenderB);
        usdc.approve(address(escrow), 8 ether);
        vm.prank(lenderB);
        escrow.submitOffer(loanB, 8 ether, 2000, 90);

        assertEq(escrow.listingEscrowBalance(loanA), 5 ether);
        assertEq(escrow.listingEscrowBalance(loanB), 8 ether);
        assertEq(escrow.dealEscrowBalance(dealD), 3 ether);

        vm.prank(borrower);
        escrow.acceptOffer(loanA, lender, 5 ether, 1000, 60);

        uint256 interestA = uint256(5 ether * 1000 * 60) / 3650000;
        vm.prank(borrower);
        usdc.approve(address(escrow), 5 ether + interestA);
        vm.prank(borrower);
        escrow.repay(loanA, 5 ether + interestA);

        assertEq(nft.ownerOf(tokenA), borrower);
        assertEq(escrow.listingEscrowBalance(loanB), 8 ether);
        assertEq(escrow.dealEscrowBalance(dealD), 3 ether);
    }

    /// @notice Pause blocks both systems
    function test_PauseBlocksBothSystems() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrow), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrow.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrow), 10 ether);
        vm.prank(lender);
        escrow.submitOffer(listingId, 10 ether, 1420, 30);

        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));

        vm.prank(admin);
        escrow.pause();
        assertTrue(escrow.paused());

        vm.prank(borrower);
        vm.expectRevert(VaultEscrow.ContractPaused.selector);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        vm.expectRevert(VaultEscrow.ContractPaused.selector);
        escrow.fundDeal(dealId, 5 ether);

        vm.prank(admin);
        escrow.unpause();
        assertFalse(escrow.paused());

        vm.prank(borrower);
        escrow.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
    }

    /// @notice Admin transfer lockout
    function test_AdminTransfer_Lockout() public {
        address newAdmin = makeAddr("newAdmin");

        vm.prank(seller);
        uint256 dealId = escrow.listDeal(1 ether, bytes32(uint256(1)));

        vm.prank(admin);
        escrow.transferAdmin(newAdmin);

        // Old admin locked out from admin-only functions
        vm.prank(admin);
        vm.expectRevert(VaultEscrow.NotAdmin.selector);
        escrow.setPlatformFee(100);

        // New admin can act
        vm.prank(newAdmin);
        escrow.setPlatformFee(100);
    }
}
