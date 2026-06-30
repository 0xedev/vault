// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../mocks/MockERC20.sol";
import "../mocks/MockERC721.sol";
import "../../contracts/VaultNFT.sol";
import "../../contracts/VaultDeals.sol";

contract SignedOffersTest is Test {
    bytes32 constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    MockERC20 usdc;
    MockERC721 nft;
    VaultNFT vaultNft;
    VaultDeals vaultDeals;

    address admin = makeAddr("admin");
    address borrower = makeAddr("borrower");
    address seller = makeAddr("seller");
    uint256 lenderPk = 0xA11CE;
    uint256 buyerPk = 0xB0B;
    address lender;
    address buyer;

    function setUp() public {
        lender = vm.addr(lenderPk);
        buyer = vm.addr(buyerPk);
        usdc = new MockERC20();
        nft = new MockERC721();
        vm.prank(admin);
        vaultNft = new VaultNFT(address(usdc), 150);
        vm.prank(admin);
        vaultDeals = new VaultDeals(address(usdc), 150);
        usdc.mint(lender, 1_000_000 ether);
        usdc.mint(buyer, 1_000_000 ether);
    }

    function _domain(string memory name, address verifyingContract) internal view returns (bytes32) {
        return keccak256(abi.encode(
            EIP712_DOMAIN_TYPEHASH,
            keccak256(bytes(name)),
            keccak256(bytes("1")),
            block.chainid,
            verifyingContract
        ));
    }

    function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _loanDigest(VaultNFT.SignedLoanOffer memory offer) internal view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            vaultNft.SIGNED_LOAN_OFFER_TYPEHASH(),
            offer.listingId,
            offer.lender,
            offer.amount,
            offer.apr,
            offer.term,
            offer.expiry,
            offer.nonce
        ));
        return keccak256(abi.encodePacked("\x19\x01", _domain("VaultNFT", address(vaultNft)), structHash));
    }

    function _dealDigest(VaultDeals.SignedDealOffer memory offer) internal view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            vaultDeals.SIGNED_DEAL_OFFER_TYPEHASH(),
            offer.dealId,
            offer.buyer,
            offer.amount,
            offer.expiry,
            offer.nonce
        ));
        return keccak256(abi.encodePacked("\x19\x01", _domain("VaultDeals", address(vaultDeals)), structHash));
    }

    function _listNft() internal returns (uint256 listingId) {
        uint256 tokenId = nft.mint(borrower);
        vm.prank(borrower);
        nft.approve(address(vaultNft), tokenId);
        vm.prank(borrower);
        listingId = vaultNft.listNFT(address(nft), tokenId, 10 ether, 1420, 30);
    }

    function _listDeal() internal returns (uint256 dealId) {
        vm.prank(seller);
        dealId = vaultDeals.listDeal(5 ether, bytes32(uint256(0xabc)));
    }

    function test_acceptSignedLoanOffer_ActivatesLoan() public {
        uint256 listingId = _listNft();
        VaultNFT.SignedLoanOffer memory offer = VaultNFT.SignedLoanOffer({
            listingId: listingId,
            lender: lender,
            amount: 10 ether,
            apr: 1420,
            term: 30,
            expiry: block.timestamp + 1 days,
            nonce: 1
        });
        vm.prank(lender);
        usdc.approve(address(vaultNft), offer.amount);
        bytes memory signature = _sign(lenderPk, _loanDigest(offer));

        vm.prank(borrower);
        vaultNft.acceptSignedOffer(offer, signature);

        (,,,,,, address acceptedLender, uint256 acceptedAmount,,,,, VaultNFT.Stage stage) = vaultNft.listings(listingId);
        assertEq(acceptedLender, lender);
        assertEq(acceptedAmount, offer.amount);
        assertEq(uint256(stage), uint256(VaultNFT.Stage.ACTIVE));
        assertTrue(vaultNft.usedOrCancelledOfferNonces(lender, offer.nonce));
    }

    function test_acceptSignedDealOffer_FundsEscrowOnly() public {
        uint256 dealId = _listDeal();
        VaultDeals.SignedDealOffer memory offer = VaultDeals.SignedDealOffer({
            dealId: dealId,
            buyer: buyer,
            amount: 4 ether,
            expiry: block.timestamp + 1 days,
            nonce: 7
        });
        uint256 sellerBefore = usdc.balanceOf(seller);
        vm.prank(buyer);
        usdc.approve(address(vaultDeals), offer.amount);
        bytes memory signature = _sign(buyerPk, _dealDigest(offer));

        vm.prank(seller);
        vaultDeals.acceptSignedDealOffer(offer, signature);

        (address dealSeller, address dealBuyer, uint256 price,,, , VaultDeals.DealStage stage,,) = vaultDeals.deals(dealId);
        assertEq(dealSeller, seller);
        assertEq(dealBuyer, buyer);
        assertEq(price, offer.amount);
        assertEq(uint256(stage), uint256(VaultDeals.DealStage.FUNDED));
        assertEq(vaultDeals.dealEscrowBalance(dealId), offer.amount);
        assertEq(usdc.balanceOf(seller), sellerBefore);
    }

    function test_signedLoanOffer_Revert_Expired() public {
        uint256 listingId = _listNft();
        VaultNFT.SignedLoanOffer memory offer = VaultNFT.SignedLoanOffer({
            listingId: listingId,
            lender: lender,
            amount: 10 ether,
            apr: 1420,
            term: 30,
            expiry: block.timestamp - 1,
            nonce: 2
        });
        bytes memory signature = _sign(lenderPk, _loanDigest(offer));
        vm.prank(lender);
        usdc.approve(address(vaultNft), offer.amount);
        vm.prank(borrower);
        vm.expectRevert(VaultCore.OfferExpired.selector);
        vaultNft.acceptSignedOffer(offer, signature);
    }

    function test_signedDealOffer_Revert_CancelledNonce() public {
        uint256 dealId = _listDeal();
        VaultDeals.SignedDealOffer memory offer = VaultDeals.SignedDealOffer({
            dealId: dealId,
            buyer: buyer,
            amount: 5 ether,
            expiry: block.timestamp + 1 days,
            nonce: 9
        });
        bytes memory signature = _sign(buyerPk, _dealDigest(offer));
        vm.prank(buyer);
        vaultDeals.cancelOfferNonce(offer.nonce);
        vm.prank(buyer);
        usdc.approve(address(vaultDeals), offer.amount);
        vm.prank(seller);
        vm.expectRevert(VaultCore.OfferNonceUnavailable.selector);
        vaultDeals.acceptSignedDealOffer(offer, signature);
    }
}
