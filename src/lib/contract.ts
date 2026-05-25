import { createPublicClient, createWalletClient, custom, http, keccak256, toHex, type Address, type Hash } from "viem";
import { base } from "viem/chains";

export const ESCROW_ABI = [
  // ── Write ──
  {
    type: "function",
    name: "listNFT",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "apr", type: "uint256" },
      { name: "term", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelListing",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateListing",
    inputs: [
      { name: "listingId", type: "uint256" },
      { name: "newAmount", type: "uint256" },
      { name: "newApr", type: "uint256" },
      { name: "newTerm", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitOffer",
    inputs: [
      { name: "listingId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "apr", type: "uint256" },
      { name: "term", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdrawOffer",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "acceptOffer",
    inputs: [
      { name: "listingId", type: "uint256" },
      { name: "lender", type: "address" },
      { name: "acceptedAmount", type: "uint256" },
      { name: "acceptedApr", type: "uint256" },
      { name: "acceptedTerm", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "repay",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "repayPartial",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "claimCollateral",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "dispute",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolve",
    inputs: [
      { name: "listingId", type: "uint256" },
      { name: "nftToLender", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ── Read ──
  {
    type: "function",
    name: "listingCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listings",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "borrower", type: "address" },
      { name: "nftContract", type: "address" },
      { name: "nftTokenId", type: "uint256" },
      { name: "principal", type: "uint256" },
      { name: "apr", type: "uint256" },
      { name: "term", type: "uint256" },
      { name: "acceptedLender", type: "address" },
      { name: "acceptedAmount", type: "uint256" },
      { name: "acceptedApr", type: "uint256" },
      { name: "acceptedTerm", type: "uint256" },
      { name: "fundedAt", type: "uint256" },
      { name: "repaidSoFar", type: "uint256" },
      { name: "stage", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lenderDeposits",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRepaymentDue",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [
      { name: "totalDue", type: "uint256" },
      { name: "paid", type: "uint256" },
      { name: "remaining", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDeadline",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOfferCount",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  // ── Mini Apps ──
  {
    type: "function",
    name: "listMiniApp",
    inputs: [
      { name: "price", type: "uint256" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelMiniApp",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateMiniApp",
    inputs: [
      { name: "listingId", type: "uint256" },
      { name: "newPrice", type: "uint256" },
      { name: "newMetadataHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyMiniApp",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "miniApps",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "seller", type: "address" },
      { name: "price", type: "uint256" },
      { name: "metadataHash", type: "bytes32" },
      { name: "stage", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "miniAppCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  // ── Deal Escrow System ──
  {
    type: "function",
    name: "listDeal",
    inputs: [
      { name: "price", type: "uint256" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelDeal",
    inputs: [{ name: "dealId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateDeal",
    inputs: [
      { name: "dealId", type: "uint256" },
      { name: "newPrice", type: "uint256" },
      { name: "newMetadataHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyDeal",
    inputs: [{ name: "dealId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "fundDeal",
    inputs: [{ name: "dealId", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "markDelivered",
    inputs: [{ name: "dealId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "extendDeadline",
    inputs: [{ name: "dealId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "confirmDelivery",
    inputs: [{ name: "dealId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "disputeDeal",
    inputs: [{ name: "dealId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolveDeal",
    inputs: [
      { name: "dealId", type: "uint256" },
      { name: "buyerAmount", type: "uint256" },
      { name: "sellerAmount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "refundDeal",
    inputs: [{ name: "dealId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "buyMiniApp",
    inputs: [{ name: "miniAppId", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "deals",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "seller", type: "address" },
      { name: "buyer", type: "address" },
      { name: "price", type: "uint256" },
      { name: "metadataHash", type: "bytes32" },
      { name: "deadline", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "stage", type: "uint8" },
      { name: "buyerAmount", type: "uint256" },
      { name: "sellerAmount", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "dealCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "dealEscrowBalance",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  // ── Pause ──
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  // ── Offer tracking ──
  {
    type: "function",
    name: "offers",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [
      { name: "apr", type: "uint256" },
      { name: "term", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

export function getEscrowAddress(): Address {
  const addr = process.env.NEXT_PUBLIC_ESCROW_CONTRACT;
  if (!addr) throw new Error("NEXT_PUBLIC_ESCROW_CONTRACT not set");
  return addr as Address;
}

export function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(),
  });
}

export function getWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet available");
  }
  return createWalletClient({
    chain: base,
    transport: custom(window.ethereum as never),
  });
}

// ── Typed write helpers ──

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

// ── Mini App helpers ──

/** Hash the full metadata JSON so the on-chain record can be verified against off-chain data. */
export function hashMetadata(metadata: Record<string, unknown>): `0x${string}` {
  const json = JSON.stringify(metadata, Object.keys(metadata).sort());
  return keccak256(toHex(json));
}

/** Generate a short human-readable verification code from a hash. */
export function verificationCode(hash: `0x${string}`): string {
  return hash.slice(2, 14).toUpperCase();
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

// ── Deal Escrow helpers ──

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

// ── ERC721 helpers ──

export const ERC721_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

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

// ── Error parser ────────────────────────────────────────────

/**
 * Maps raw viem/wallet errors to user-friendly messages.
 */
export function parseContractError(err: unknown): string {
  if (!err) return "Unknown error";

  const msg = typeof err === "string" ? err
    : (err as { message?: string }).message
    || (err as { shortMessage?: string }).shortMessage
    || String(err);

  const lower = msg.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected by user")) {
    return "Transaction rejected in wallet.";
  }
  if (lower.includes("4001") || lower.includes("action rejected")) {
    return "Transaction rejected in wallet.";
  }
  if (lower.includes("no wallet available") || lower.includes("window.ethereum")) {
    return "No wallet detected. Install MetaMask or Rainbow.";
  }
  if (lower.includes("network") || lower.includes("chain")) {
    return "Wrong network. Switch to Base in your wallet.";
  }
  if (lower.includes("insufficient funds") || lower.includes("insufficient balance")) {
    return "Insufficient ETH balance to complete this transaction.";
  }

  if (lower.includes("notnfrowner")) return "You don't own this NFT.";
  if (lower.includes("notborrower")) return "Only the borrower can perform this action.";
  if (lower.includes("notlender")) return "Only the lender can perform this action.";
  if (lower.includes("notadmin")) return "Only the admin can perform this action.";
  if (lower.includes("invalidstage")) return "This action is not allowed at the current stage.";
  if (lower.includes("deadlinenotpassed")) return "The deadline has not passed yet.";
  if (lower.includes("offerexpired")) return "This offer has expired.";
  if (lower.includes("alreadyoffered")) return "You already have an active offer on this listing.";
  if (lower.includes("transferfailed")) return "Transfer failed. Contact support.";
  if (lower.includes("paused")) return "Contract is paused. Check back shortly.";
  if (lower.includes("offermismatch")) return "The accepted terms don't match your original offer.";
  if (lower.includes("must send eth") || lower.includes("msg.value")) return "ETH amount is required.";

  if (lower.includes("next_public_escrow_contract")) {
    return "Escrow contract not configured. Set NEXT_PUBLIC_ESCROW_CONTRACT in .env";
  }

  const revertMatch = msg.match(/reverted with the following reason:\s*(.+?)(?:\n|$|")/);
  if (revertMatch) return revertMatch[1].trim();

  const short = msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
  return short;
}
