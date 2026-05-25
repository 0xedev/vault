// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC721.sol";
import "../../contracts/VaultEscrow.sol";

contract DealEscrowTest is Test {
    VaultEscrow public escrow;
    address admin = makeAddr("admin");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address third = makeAddr("third");
    bytes32 constant HASH = bytes32(uint256(0xabcdef));

    function setUp() public {
        vm.prank(admin);
        escrow = new VaultEscrow(150);
        vm.deal(buyer, 100 ether);
        vm.deal(seller, 10 ether);
    }

    function _listAndVerify(uint256 price) internal returns (uint256) {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(price, HASH);
        vm.prank(admin);
        escrow.verifyDeal(dealId);
        return dealId;
    }

    function test_listDeal() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        assertEq(dealId, 1);
        (address s,,,,,,,,) = escrow.deals(dealId);
        assertEq(s, seller);
    }

    function test_verify() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        vm.prank(admin);
        escrow.verifyDeal(dealId);
    }

    function test_verify_Event() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit VaultEscrow.DealDelivered(dealId);
        escrow.verifyDeal(dealId);
    }

    function test_verify_Revert_NotAdmin() public {
        vm.prank(seller);
        uint256 dealId = escrow.listDeal(5 ether, HASH);
        vm.prank(seller);
        vm.expectRevert(VaultEscrow.NotAdmin.selector);
        escrow.verifyDeal(dealId);
    }

    function test_fundDeal() public {
        uint256 dealId = _listAndVerify(5 ether);
        vm.prank(buyer);
        escrow.fundDeal{value: 5 ether}(dealId);
        assertEq(escrow.dealEscrowBalance(dealId), 5 ether);
    }

    function test_fundDeal_WrongAmount() public {
        uint256 dealId = _listAndVerify(5 ether);
        vm.prank(buyer);
        vm.expectRevert("ETH sent must equal listing price");
        escrow.fundDeal{value: 3 ether}(dealId);
    }

    function test_fundDeal_SelfBuy() public {
        uint256 dealId = _listAndVerify(5 ether);
        vm.deal(seller, 100 ether);
        vm.prank(seller);
        vm.expectRevert("Seller cannot buy own listing");
        escrow.fundDeal{value: 5 ether}(dealId);
    }

    function test_markDelivered_Confirm() public {
        uint256 dealId = _listAndVerify(5 ether);
        vm.prank(buyer);
        escrow.fundDeal{value: 5 ether}(dealId);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        vm.prank(buyer);
        escrow.confirmDelivery(dealId);
        assertEq(escrow.dealEscrowBalance(dealId), 0);
    }

    function test_dispute_Resolve() public {
        uint256 dealId = _listAndVerify(5 ether);
        vm.prank(buyer);
        escrow.fundDeal{value: 5 ether}(dealId);
        vm.prank(seller);
        escrow.markDelivered(dealId);
        vm.prank(buyer);
        escrow.disputeDeal(dealId);
        uint256 balB = buyer.balance;
        vm.prank(admin);
        escrow.resolveDeal(dealId, 2 ether, 3 ether);
        assertEq(buyer.balance, balB + 2 ether);
    }

    function test_refund() public {
        uint256 dealId = _listAndVerify(5 ether);
        vm.prank(buyer);
        escrow.fundDeal{value: 5 ether}(dealId);
        vm.warp(block.timestamp + 8 days);
        uint256 balB = buyer.balance;
        vm.prank(buyer);
        escrow.refundDeal(dealId);
        assertEq(buyer.balance, balB + 5 ether);
    }

    function test_refund_BeforeDeadline() public {
        uint256 dealId = _listAndVerify(5 ether);
        vm.prank(buyer);
        escrow.fundDeal{value: 5 ether}(dealId);
        vm.prank(buyer);
        vm.expectRevert("Deadline not passed");
        escrow.refundDeal(dealId);
    }

    // ── MiniApp backward compat
    function test_listMiniApp() public {
        vm.prank(seller);
        uint256 miniId = escrow.listMiniApp(5 ether, HASH);
        assertEq(miniId, 1);
        assertEq(escrow.dealCount(), 1);
    }

    function test_buyMiniApp() public {
        vm.prank(seller);
        uint256 miniId = escrow.listMiniApp(5 ether, HASH);
        vm.prank(admin);
        escrow.verifyMiniApp(miniId);
        uint256 balS = seller.balance;
        vm.prank(buyer);
        escrow.buyMiniApp{value: 5 ether}(miniId);
        assertGt(seller.balance, balS);
    }
}
