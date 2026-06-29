// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../mocks/MockERC20.sol";
import "../../contracts/VaultNFT.sol";
import "../../contracts/VaultDeals.sol";

contract GasTest is Test {
    VaultNFT public escrowNft;
    VaultDeals public escrow;
    MockERC721 public nft;
    MockERC20 public usdc;

    address admin = makeAddr("admin");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address borrower = makeAddr("borrower");
    address lender = makeAddr("lender");

    function setUp() public {
        usdc = new MockERC20();
        vm.prank(admin);
        escrowNft = new VaultNFT(address(usdc), 150);
        vm.prank(admin);
        escrow = new VaultDeals(address(usdc), 150);
        nft = new MockERC721();
        usdc.mint(buyer, 1_000_000_000 ether);
        usdc.mint(lender, 1_000_000_000 ether);
        usdc.mint(borrower, 1_000_000_000 ether);
        usdc.mint(seller, 1_000_000_000 ether);
        vm.prank(buyer);
        usdc.approve(address(escrow), type(uint256).max);
        vm.prank(seller);
        usdc.approve(address(escrow), type(uint256).max);
        vm.prank(lender);
        usdc.approve(address(escrowNft), type(uint256).max);
        vm.prank(buyer);
        usdc.approve(address(escrowNft), type(uint256).max);
        vm.prank(borrower);
        usdc.approve(address(escrowNft), type(uint256).max);
    }

    /* ================================================================
       NFT LOAN GAS
       ================================================================ */

    function testGas_listNFT() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
    }

    function testGas_submitOffer() public {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(escrowNft), tokenId);
        vm.prank(borrower);
        uint256 listingId = escrowNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
        vm.prank(lender);
        usdc.approve(address(escrowNft), 10 ether);
        vm.prank(lender);
        escrowNft.submitOffer(listingId, 10 ether, 1420, 30);
    }

    function testGas_acceptOffer() public {
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
    }

    function testGas_repay() public {
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
        usdc.approve(address(escrowNft), totalDue);
        vm.prank(borrower);
        escrowNft.repay(listingId, totalDue);
    }

    function testGas_repayPartial() public {
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
        uint256 half = (10 ether + interest) / 2;
        vm.prank(borrower);
        usdc.approve(address(escrowNft), half);
        vm.prank(borrower);
        escrowNft.repayPartial(listingId, half);
    }

    function testGas_claimCollateral() public {
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
        vm.warp(block.timestamp + 31 days);
        vm.prank(lender);
        escrowNft.claimCollateral(listingId);
    }

    /* ================================================================
       DEAL ESCROW GAS
       ================================================================ */

    function testGas_listDeal() public {
        vm.prank(seller);
        escrow.listDeal(5 ether, bytes32(uint256(1)));
    }

    function testGas_fundDeal() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
    }

    function testGas_confirmDelivery() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        vm.prank(buyer);
        escrow.confirmDelivery(dealId);
    }

    function testGas_refundDeal() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.fundDeal(dealId, 5 ether);
        vm.warp(block.timestamp + 8 days);
        vm.prank(buyer);
        escrow.refundDeal(dealId);
    }

    function testGas_disputeDeal() public {
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
    }

    function testGas_resolveDeal() public {
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
        escrow.resolveDeal(dealId, 2 ether, 3 ether);
    }

    function testGas_buyMiniApp() public {
        vm.prank(seller);
        uint256 miniAppId = escrow.listMiniApp(5 ether, bytes32(uint256(1)));
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.buyMiniApp(miniAppId, 5 ether);
    }
}
