// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC20.sol";
import "../../contracts/VaultEscrow.sol";

contract DealEscrowTest is Test {
    VaultEscrow public escrow;
    MockERC20 public usdc;
    address admin = makeAddr("admin");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address third = makeAddr("third");
    bytes32 constant HASH = bytes32(uint256(0xabcdef));

    function setUp() public {
        usdc = new MockERC20();
        vm.prank(admin);
        escrow = new VaultEscrow(address(usdc), 150);
        usdc.mint(buyer, 1_000_000_000 ether);
        usdc.mint(seller, 1_000_000_000 ether);
    }

    function _fund(uint256 dealId, uint256 amount) internal {
        vm.prank(buyer);
        usdc.approve(address(escrow), amount);
        vm.prank(buyer);
        escrow.fundDeal(dealId, amount);
    }

    function test_listDeal() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        assertEq(dealId, 1);
        (address s,,,,,,,,) = escrow.deals(dealId);
        assertEq(s, seller);
    }

    function test_fundDeal() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        _fund(dealId, 5 ether);
        assertEq(escrow.dealEscrowBalance(dealId), 5 ether);
    }

    function test_fundDeal_WrongAmount() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        vm.prank(buyer);
        usdc.approve(address(escrow), 3 ether);
        vm.prank(buyer);
        vm.expectRevert("Amount must equal listing price");
        escrow.fundDeal(dealId, 3 ether);
    }

    function test_fundDeal_SelfBuy() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        vm.prank(seller);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(seller);
        vm.expectRevert("Seller cannot buy own listing");
        escrow.fundDeal(dealId, 5 ether);
    }

    function test_markDelivered_Confirm() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        _fund(dealId, 5 ether);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        vm.prank(buyer);
        escrow.confirmDelivery(dealId);
        assertEq(escrow.dealEscrowBalance(dealId), 0);
    }

    function test_dispute_Resolve() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        _fund(dealId, 5 ether);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        vm.prank(buyer);
        escrow.disputeDeal(dealId);
        uint256 balB = usdc.balanceOf(buyer);
        vm.prank(admin);
        escrow.resolveDeal(dealId, 2 ether, 3 ether);
        assertEq(usdc.balanceOf(buyer), balB + 2 ether);
    }

    function test_refund() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        _fund(dealId, 5 ether);
        vm.warp(block.timestamp + 8 days);
        uint256 balB = usdc.balanceOf(buyer);
        vm.prank(buyer);
        escrow.refundDeal(dealId);
        assertEq(usdc.balanceOf(buyer), balB + 5 ether);
    }

    function test_refund_BeforeDeadline() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        _fund(dealId, 5 ether);
        vm.prank(buyer);
        vm.expectRevert("Deadline not passed");
        escrow.refundDeal(dealId);
    }

    // ── MiniApp backward compat (no verify needed)
    function test_listMiniApp() public {
        vm.prank(seller);
        uint256 miniId = escrow.listMiniApp(5 ether, HASH);
        assertEq(miniId, 1);
        assertEq(escrow.dealCount(), 1);
    }

    function test_buyMiniApp() public {
        vm.prank(seller);
        uint256 miniId = escrow.listMiniApp(5 ether, HASH);
        uint256 balS = usdc.balanceOf(seller);
        vm.prank(buyer);
        usdc.approve(address(escrow), 5 ether);
        vm.prank(buyer);
        escrow.buyMiniApp(miniId, 5 ether);
        assertGt(usdc.balanceOf(seller), balS);
    }
}
