import { type Address, type Hash } from "viem";
import { base } from "viem/chains";
import { VaultNFT_ABI, VaultDeals_ABI, ERC721_ABI } from "./contract-abi";
import type { SignedDealOfferMessage, SignedLoanOfferMessage } from "./signed-offers";
import {
  getNftAddress,
  getDealsAddress,
  getWalletClient,
} from "./contract-helpers";

// ── NFT loan writes (VaultNFT) ───────────────────────────────

export async function writeListNFT(
  account: Address,
  nftContract: Address,
  tokenId: bigint,
  amountWei: bigint,
  aprBps: number,
  termDays: number,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "listNFT",
    args: [nftContract, tokenId, amountWei, BigInt(aprBps), BigInt(termDays)],
    account,
    chain: base,
  });
}

export async function writeCancelListing(
  account: Address,
  listingId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "cancelListing",
    args: [listingId],
    account,
    chain: base,
  });
}

export async function writeUpdateListing(
  account: Address,
  listingId: bigint,
  newAmountWei: bigint,
  newAprBps: number,
  newTermDays: number,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "updateListing",
    args: [listingId, newAmountWei, BigInt(newAprBps), BigInt(newTermDays)],
    account,
    chain: base,
  });
}

export async function writeSubmitOffer(
  account: Address,
  listingId: bigint,
  amountWei: bigint,
  aprBps: number,
  termDays: number,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "submitOffer",
    args: [listingId, amountWei, BigInt(aprBps), BigInt(termDays)],
    account,
    chain: base,
  });
}

export async function writeUpdateOffer(
  account: Address,
  listingId: bigint,
  newAmountWei: bigint,
  newAprBps: number,
  newTermDays: number,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "updateOffer",
    args: [listingId, newAmountWei, BigInt(newAprBps), BigInt(newTermDays)],
    account,
    chain: base,
  });
}

export async function writeAcceptOffer(
  account: Address,
  listingId: bigint,
  lender: Address,
  amountWei: bigint,
  aprBps: number,
  termDays: number,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "acceptOffer",
    args: [listingId, lender, amountWei, BigInt(aprBps), BigInt(termDays)],
    account,
    chain: base,
  });
}

export async function writeAcceptSignedLoanOffer(
  account: Address,
  offer: SignedLoanOfferMessage,
  signature: `0x${string}`,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "acceptSignedOffer",
    args: [offer, signature],
    account,
    chain: base,
  });
}

export async function writeCancelNftOfferNonce(
  account: Address,
  nonce: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "cancelOfferNonce",
    args: [nonce],
    account,
    chain: base,
  });
}

export async function writeRepay(
  account: Address,
  listingId: bigint,
  amountWei: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "repay",
    args: [listingId, amountWei],
    account,
    chain: base,
  });
}

export async function writeRepayPartial(
  account: Address,
  listingId: bigint,
  amountWei: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "repayPartial",
    args: [listingId, amountWei],
    account,
    chain: base,
  });
}

export async function writeClaimCollateral(
  account: Address,
  listingId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "claimCollateral",
    args: [listingId],
    account,
    chain: base,
  });
}

export async function writeWithdrawOffer(
  account: Address,
  listingId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "withdrawOffer",
    args: [listingId],
    account,
    chain: base,
  });
}

export async function writeDispute(
  account: Address,
  listingId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "dispute",
    args: [listingId],
    account,
    chain: base,
  });
}

export async function writeResolve(
  account: Address,
  listingId: bigint,
  nftToLender: boolean,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "resolve",
    args: [listingId, nftToLender],
    account,
    chain: base,
  });
}

// ── Deal writes (VaultDeals) ──────────────────────────────────

export type DealKind = "otc" | "mini_app" | "x_account" | "farcaster" | "clanker" | "bundle";

const DEAL_KIND_CODE: Record<DealKind, number> = {
  otc: 0,
  mini_app: 1,
  x_account: 2,
  farcaster: 3,
  clanker: 4,
  bundle: 5,
};

export async function writeListDeal(
  account: Address,
  priceWei: bigint,
  metadataHash: `0x${string}`,
  kind: DealKind = "otc",
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  const functionName = kind === "otc" ? "listDeal" : "listDealWithKind";
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName,
    args: kind === "otc" ? [priceWei, metadataHash] : [priceWei, metadataHash, DEAL_KIND_CODE[kind]],
    account,
    chain: base,
  });
}

export async function writeFundDeal(
  account: Address,
  dealId: bigint,
  amountWei: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "fundDeal",
    args: [dealId, amountWei],
    account,
    chain: base,
  });
}

export async function writeMarkDelivered(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "markDelivered",
    args: [dealId],
    account,
    chain: base,
  });
}

export async function writeConfirmDelivery(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "confirmDelivery",
    args: [dealId],
    account,
    chain: base,
  });
}

export async function writeDisputeDeal(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "disputeDeal",
    args: [dealId],
    account,
    chain: base,
  });
}

export async function writeRefundDeal(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "refundDeal",
    args: [dealId],
    account,
    chain: base,
  });
}

export async function writeCancelDeal(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "cancelDeal",
    args: [dealId],
    account,
    chain: base,
  });
}

export async function writeUpdateDeal(
  account: Address,
  dealId: bigint,
  newPriceWei: bigint,
  newMetadataHash: `0x${string}`,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "updateDeal",
    args: [dealId, newPriceWei, newMetadataHash],
    account,
    chain: base,
  });
}

export async function writeExtendDeadline(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "extendDeadline",
    args: [dealId],
    account,
    chain: base,
  });
}

export async function writeResolveDeal(
  account: Address,
  dealId: bigint,
  buyerAmountWei: bigint,
  sellerAmountWei: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "resolveDeal",
    args: [dealId, buyerAmountWei, sellerAmountWei],
    account,
    chain: base,
  });
}

export async function writeSubmitDealOffer(
  account: Address,
  dealId: bigint,
  amountWei: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "submitDealOffer",
    args: [dealId, amountWei],
    account,
    chain: base,
  });
}

export async function writeWithdrawDealOffer(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "withdrawDealOffer",
    args: [dealId],
    account,
    chain: base,
  });
}

export async function writeAcceptDealOffer(
  account: Address,
  dealId: bigint,
  buyer: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "acceptDealOffer",
    args: [dealId, buyer],
    account,
    chain: base,
  });
}

export async function writeAcceptSignedDealOffer(
  account: Address,
  offer: SignedDealOfferMessage,
  signature: `0x${string}`,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "acceptSignedDealOffer",
    args: [offer, signature],
    account,
    chain: base,
  });
}

export async function writeCancelDealOfferNonce(
  account: Address,
  nonce: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "cancelOfferNonce",
    args: [nonce],
    account,
    chain: base,
  });
}

// ── Mini App writes (VaultDeals) ──────────────────────────────

export async function writeListMiniApp(
  account: Address,
  priceWei: bigint,
  metadataHash: `0x${string}`,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "listMiniApp",
    args: [priceWei, metadataHash],
    account,
    chain: base,
  });
}

export async function writeCancelMiniApp(
  account: Address,
  listingId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "cancelMiniApp",
    args: [listingId],
    account,
    chain: base,
  });
}

export async function writeUpdateMiniApp(
  account: Address,
  listingId: bigint,
  newPriceWei: bigint,
  newMetadataHash: `0x${string}`,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "updateMiniApp",
    args: [listingId, newPriceWei, newMetadataHash],
    account,
    chain: base,
  });
}

export async function writeBuyMiniApp(
  account: Address,
  miniAppId: bigint,
  amountWei: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "buyMiniApp",
    args: [miniAppId, amountWei],
    account,
    chain: base,
  });
}

// ── Bundle (alias for listDeal) ───────────────────────────────

export async function writeListBundle(
  account: Address,
  priceWei: bigint,
  metadataHash: `0x${string}`,
): Promise<Hash> {
  return writeListDeal(account, priceWei, metadataHash, "bundle");
}

// ── Admin writes (called on VaultNFT contract) ────────────────

export async function writePause(
  account: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "pause",
    args: [],
    account,
    chain: base,
  });
}

export async function writeUnpause(
  account: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "unpause",
    args: [],
    account,
    chain: base,
  });
}

export async function writeAddAdmin(
  account: Address,
  newAdmin: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "addAdmin",
    args: [newAdmin],
    account,
    chain: base,
  });
}

export async function writeRemoveAdmin(
  account: Address,
  target: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "removeAdmin",
    args: [target],
    account,
    chain: base,
  });
}

export async function writeSetTreasury(
  account: Address,
  newTreasury: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "setTreasury",
    args: [newTreasury],
    account,
    chain: base,
  });
}

export async function writeSetPlatformFee(
  account: Address,
  newFeeBps: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getNftAddress();
  return wallet.writeContract({
    address,
    abi: VaultNFT_ABI,
    functionName: "setPlatformFee",
    args: [newFeeBps],
    account,
    chain: base,
  });
}

// ── Admin writes (called on VaultDeals contract) ───────────────

export async function writePauseDeals(
  account: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "pause",
    args: [],
    account,
    chain: base,
  });
}

export async function writeUnpauseDeals(
  account: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "unpause",
    args: [],
    account,
    chain: base,
  });
}

export async function writeAddAdminDeals(
  account: Address,
  newAdmin: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "addAdmin",
    args: [newAdmin],
    account,
    chain: base,
  });
}

export async function writeRemoveAdminDeals(
  account: Address,
  target: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "removeAdmin",
    args: [target],
    account,
    chain: base,
  });
}

export async function writeSetTreasuryDeals(
  account: Address,
  newTreasury: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "setTreasury",
    args: [newTreasury],
    account,
    chain: base,
  });
}

export async function writeSetPlatformFeeDeals(
  account: Address,
  newFeeBps: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = await getDealsAddress();
  return wallet.writeContract({
    address,
    abi: VaultDeals_ABI,
    functionName: "setPlatformFee",
    args: [newFeeBps],
    account,
    chain: base,
  });
}

// ── ERC-721 helpers ───────────────────────────────────────────

export async function approveNft(
  account: Address,
  nftContract: Address,
  tokenId: bigint,
  spender: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  return wallet.writeContract({
    address: nftContract,
    abi: ERC721_ABI,
    functionName: "approve",
    args: [spender, tokenId],
    account,
    chain: base,
  });
}
