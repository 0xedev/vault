import { type Address, type Hash } from "viem";
import { base } from "viem/chains";
import { ESCROW_ABI, ERC721_ABI } from "./contract-abi";
import { getEscrowAddress, getWalletClient } from "./contract-helpers";

export async function writeListNFT(
  account: Address,
  nftContract: Address,
  tokenId: bigint,
  amountWei: bigint,
  aprBps: number,
  termDays: number,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "listNFT",
    args: [nftContract, tokenId, amountWei, BigInt(aprBps), BigInt(termDays)],
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "submitOffer",
    args: [listingId, amountWei, BigInt(aprBps), BigInt(termDays)],
    account,
    chain: base,
    value: amountWei,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "acceptOffer",
    args: [listingId, lender, amountWei, BigInt(aprBps), BigInt(termDays)],
    account,
    chain: base,
  });
}

export async function writeRepay(
  account: Address,
  listingId: bigint,
  totalDueWei: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "repay",
    args: [listingId],
    account,
    chain: base,
    value: totalDueWei,
  });
}

export async function writeClaimCollateral(
  account: Address,
  listingId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "withdrawOffer",
    args: [listingId],
    account,
    chain: base,
  });
}

export async function writeCancelListing(
  account: Address,
  listingId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "updateListing",
    args: [listingId, newAmountWei, BigInt(newAprBps), BigInt(newTermDays)],
    account,
    chain: base,
  });
}

export async function writeListMiniApp(
  account: Address,
  priceWei: bigint,
  metadataHash: `0x${string}`,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "updateMiniApp",
    args: [listingId, newPriceWei, newMetadataHash],
    account,
    chain: base,
  });
}

export async function writeVerifyMiniApp(
  account: Address,
  listingId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "verifyMiniApp",
    args: [listingId],
    account,
    chain: base,
  });
}

export async function writeBuyMiniApp(
  account: Address,
  miniAppId: bigint,
  priceWei: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "buyMiniApp",
    args: [miniAppId],
    account,
    chain: base,
    value: priceWei,
  });
}

export async function writeListDeal(
  account: Address,
  priceWei: bigint,
  metadataHash: `0x${string}`,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "listDeal",
    args: [priceWei, metadataHash],
    account,
    chain: base,
  });
}

export async function writeFundDeal(
  account: Address,
  dealId: bigint,
  priceWei: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "fundDeal",
    args: [dealId],
    account,
    chain: base,
    value: priceWei,
  });
}

export async function writeMarkDelivered(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "disputeDeal",
    args: [dealId],
    account,
    chain: base,
  });
}

export async function writeListBundle(
  account: Address,
  priceWei: bigint,
  metadataHash: `0x${string}`,
): Promise<Hash> {
  return writeListDeal(account, priceWei, metadataHash);
}

export async function writeRefundDeal(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "refundDeal",
    args: [dealId],
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "repayPartial",
    args: [listingId],
    account,
    chain: base,
    value: amountWei,
  });
}

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

export async function writeDispute(
  account: Address,
  listingId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "resolve",
    args: [listingId, nftToLender],
    account,
    chain: base,
  });
}

export async function writeCancelDeal(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "updateDeal",
    args: [dealId, newPriceWei, newMetadataHash],
    account,
    chain: base,
  });
}

export async function writeVerifyDeal(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "verifyDeal",
    args: [dealId],
    account,
    chain: base,
  });
}

export async function writeExtendDeadline(
  account: Address,
  dealId: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "resolveDeal",
    args: [dealId, buyerAmountWei, sellerAmountWei],
    account,
    chain: base,
  });
}

export async function writePause(
  account: Address,
): Promise<Hash> {
  const wallet = getWalletClient();
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
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
  const address = getEscrowAddress();
  return wallet.writeContract({
    address,
    abi: ESCROW_ABI,
    functionName: "unpause",
    args: [],
    account,
    chain: base,
  });
}
