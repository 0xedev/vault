// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC20.sol";
import "../mocks/MockERC721.sol";
import "../../contracts/VaultCore.sol";
import "../../contracts/VaultDeals.sol";
import "../../contracts/VaultEscrowBaseMcp.sol";
import "../../contracts/VaultEscrow.sol";
import "../../contracts/VaultNFT.sol";

contract ProfileReadsTest is Test {
    VaultNFT public vaultNft;
    VaultDeals public vaultDeals;
    MockERC20 public usdc;
    MockERC721 public nft;

    address admin = makeAddr("admin");
    address borrower = makeAddr("borrower");
    address lender = makeAddr("lender");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");

    function setUp() public {
        usdc = new MockERC20();
        nft = new MockERC721();
        vaultNft = new VaultNFT(address(usdc), 150, admin);
        vaultDeals = new VaultDeals(address(usdc), 150, admin);
        usdc.mint(lender, 1_000_000_000 ether);
        usdc.mint(buyer, 1_000_000_000 ether);
    }

    function test_WrapperDeployerIsChildAdmin() public {
        vm.prank(admin);
        VaultEscrow wrapper = new VaultEscrow(address(usdc), 150);

        assertTrue(wrapper.nft().isAdmin(admin));
        assertTrue(wrapper.deals().isAdmin(admin));
        assertFalse(wrapper.nft().isAdmin(address(wrapper)));
        assertFalse(wrapper.deals().isAdmin(address(wrapper)));
    }

    function test_BaseMcpWrapperUsesExplicitChildAdmin() public {
        VaultEscrowBaseMcp wrapper = new VaultEscrowBaseMcp(address(usdc), 150, admin);

        assertTrue(wrapper.nft().isAdmin(admin));
        assertTrue(wrapper.deals().isAdmin(admin));
        assertFalse(wrapper.nft().isAdmin(address(this)));
        assertFalse(wrapper.deals().isAdmin(address(this)));
        assertFalse(wrapper.nft().isAdmin(address(wrapper)));
        assertFalse(wrapper.deals().isAdmin(address(wrapper)));
    }

    function test_NftProfileReadsAndNewestFirstActivity() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(vaultNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = vaultNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);

        vm.prank(lender);
        usdc.approve(address(vaultNft), 10 ether);
        vm.prank(lender);
        vaultNft.submitOffer(listingId, 10 ether, 1420, 30);

        VaultCore.ProfileCounters memory lenderBefore = vaultNft.getUserProfile(lender);
        assertEq(lenderBefore.lockedUSDC, 10 ether);
        assertEq(lenderBefore.loanOfferCount, 1);

        vm.prank(borrower);
        vaultNft.acceptOffer(listingId, lender, 10 ether, 1420, 30);

        VaultCore.ProfileCounters memory borrowerProfile = vaultNft.getUserProfile(borrower);
        VaultCore.ProfileCounters memory lenderProfile = vaultNft.getUserProfile(lender);
        assertEq(borrowerProfile.nftListingCount, 1);
        assertEq(borrowerProfile.activeLoanCount, 1);
        assertEq(lenderProfile.activeLoanCount, 1);
        assertEq(lenderProfile.lockedUSDC, 0);

        uint256[] memory borrowerListings = vaultNft.getUserNftListingIds(borrower, 0, 10);
        assertEq(borrowerListings.length, 1);
        assertEq(borrowerListings[0], listingId);

        VaultCore.Activity[] memory borrowerActivities = vaultNft.getUserActivities(borrower, 0, 10);
        assertGt(borrowerActivities.length, 1);
        assertEq(borrowerActivities[0].action, uint8(VaultCore.ActivityAction.OFFER_ACCEPTED));
        assertEq(borrowerActivities[0].subjectId, listingId);

        VaultNFT.ListingSummary memory summary = vaultNft.getListingSummary(listingId);
        assertEq(summary.id, listingId);
        assertEq(summary.listing.acceptedLender, lender);
        assertEq(summary.offerCount, 0);
    }

    function test_DealKindsAndProfileReads() public {
        bytes32 hash = bytes32(uint256(0xabc));
        vm.prank(seller);
        uint256 dealId = vaultDeals.listDealWithKind(5 ether, hash, VaultDeals.DealKind.BUNDLE);

        vm.prank(buyer);
        usdc.approve(address(vaultDeals), 5 ether);
        vm.prank(buyer);
        vaultDeals.fundDeal(dealId, 5 ether);

        VaultDeals.DealSummary memory summary = vaultDeals.getDealSummary(dealId);
        assertEq(uint256(summary.kind), uint256(VaultDeals.DealKind.BUNDLE));
        assertEq(summary.escrowBalance, 5 ether);

        VaultCore.ProfileCounters memory sellerProfile = vaultDeals.getUserProfile(seller);
        VaultCore.ProfileCounters memory buyerProfile = vaultDeals.getUserProfile(buyer);
        assertEq(sellerProfile.dealListingCount, 1);
        assertEq(sellerProfile.activeDealCount, 1);
        assertEq(buyerProfile.boughtDealCount, 1);
        assertEq(buyerProfile.lockedUSDC, 5 ether);

        uint256[] memory boughtDeals = vaultDeals.getUserBoughtDealIds(buyer, 0, 10);
        assertEq(boughtDeals.length, 1);
        assertEq(boughtDeals[0], dealId);

        VaultCore.Activity[] memory buyerActivities = vaultDeals.getUserActivities(buyer, 0, 1);
        assertEq(buyerActivities.length, 1);
        assertEq(buyerActivities[0].market, uint8(VaultCore.ActivityMarket.BUNDLE));
    }

    function test_MiniAppReadHelper() public {
        bytes32 hash = bytes32(uint256(0xdef));
        vm.prank(seller);
        uint256 miniAppId = vaultDeals.listMiniApp(4 ether, hash);

        VaultDeals.DealSummary memory summary = vaultDeals.getMiniAppDeal(miniAppId);
        assertEq(summary.miniAppId, miniAppId);
        assertEq(uint256(summary.kind), uint256(VaultDeals.DealKind.MINI_APP));
        assertEq(summary.deal.metadataHash, hash);
    }
}
