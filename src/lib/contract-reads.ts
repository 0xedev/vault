import { type Address } from "viem";
import {
  getPublicClient,
  getNftAddress,
  getDealsAddress,
} from "./contract-helpers";
import { VaultNFT_ABI, VaultDeals_ABI } from "./contract-abi";

export interface OnChainListing {
  borrower: Address;
  nftContract: Address;
  nftTokenId: bigint;
  principal: bigint;
  apr: bigint;
  term: bigint;
  acceptedLender: Address;
  acceptedAmount: bigint;
  acceptedApr: bigint;
  acceptedTerm: bigint;
  fundedAt: bigint;
  repaidSoFar: bigint;
  stage: number;
}

export interface OnChainDeal {
  seller: Address;
  buyer: Address;
  price: bigint;
  metadataHash: `0x${string}`;
  deadline: bigint;
  createdAt: bigint;
  stage: number;
  buyerAmount: bigint;
  sellerAmount: bigint;
}

export interface OnChainActivity {
  action: number;
  market: number;
  subjectId: bigint;
  actor: Address;
  counterparty: Address;
  amount: bigint;
  timestamp: bigint;
  status: number;
  metadataHash: `0x${string}`;
}

export interface OnChainUserProfile {
  nftListingCount: bigint;
  dealListingCount: bigint;
  boughtDealCount: bigint;
  loanOfferCount: bigint;
  dealOfferCount: bigint;
  lockedUSDC: bigint;
  activeLoanCount: bigint;
  activeDealCount: bigint;
  lifetimeVolume: bigint;
  activityCount: bigint;
}

export interface OnChainListingSummary {
  id: bigint;
  listing: OnChainListing;
  escrowBalance: bigint;
  offerCount: bigint;
  totalDue: bigint;
  paid: bigint;
  remaining: bigint;
  deadline: bigint;
}

export interface OnChainDealSummary {
  id: bigint;
  deal: OnChainDeal;
  kind: number;
  miniAppId: bigint;
  escrowBalance: bigint;
  offerCount: bigint;
}

function client() {
  return getPublicClient();
}

async function nftAddress() {
  return getNftAddress();
}

async function dealsAddress() {
  return getDealsAddress();
}

function field<T = unknown>(value: unknown, index: number, key: string): T {
  if (Array.isArray(value)) return value[index] as T;
  if (value && typeof value === "object" && key in value) return (value as Record<string, unknown>)[key] as T;
  return undefined as T;
}

function toBigInt(value: unknown): bigint {
  return BigInt(value as string | number | bigint);
}

function parseListing(value: unknown): OnChainListing {
  return {
    borrower: field<Address>(value, 0, "borrower"),
    nftContract: field<Address>(value, 1, "nftContract"),
    nftTokenId: toBigInt(field(value, 2, "nftTokenId")),
    principal: toBigInt(field(value, 3, "principal")),
    apr: toBigInt(field(value, 4, "apr")),
    term: toBigInt(field(value, 5, "term")),
    acceptedLender: field<Address>(value, 6, "acceptedLender"),
    acceptedAmount: toBigInt(field(value, 7, "acceptedAmount")),
    acceptedApr: toBigInt(field(value, 8, "acceptedApr")),
    acceptedTerm: toBigInt(field(value, 9, "acceptedTerm")),
    fundedAt: toBigInt(field(value, 10, "fundedAt")),
    repaidSoFar: toBigInt(field(value, 11, "repaidSoFar")),
    stage: Number(field(value, 12, "stage")),
  };
}

function parseDeal(value: unknown): OnChainDeal {
  return {
    seller: field<Address>(value, 0, "seller"),
    buyer: field<Address>(value, 1, "buyer"),
    price: toBigInt(field(value, 2, "price")),
    metadataHash: field<`0x${string}`>(value, 3, "metadataHash"),
    deadline: toBigInt(field(value, 4, "deadline")),
    createdAt: toBigInt(field(value, 5, "createdAt")),
    stage: Number(field(value, 6, "stage")),
    buyerAmount: toBigInt(field(value, 7, "buyerAmount")),
    sellerAmount: toBigInt(field(value, 8, "sellerAmount")),
  };
}

function parseActivity(value: unknown): OnChainActivity {
  return {
    action: Number(field(value, 0, "action")),
    market: Number(field(value, 1, "market")),
    subjectId: toBigInt(field(value, 2, "subjectId")),
    actor: field<Address>(value, 3, "actor"),
    counterparty: field<Address>(value, 4, "counterparty"),
    amount: toBigInt(field(value, 5, "amount")),
    timestamp: toBigInt(field(value, 6, "timestamp")),
    status: Number(field(value, 7, "status")),
    metadataHash: field<`0x${string}`>(value, 8, "metadataHash"),
  };
}

function parseUserProfile(value: unknown): OnChainUserProfile {
  return {
    nftListingCount: toBigInt(field(value, 0, "nftListingCount")),
    dealListingCount: toBigInt(field(value, 1, "dealListingCount")),
    boughtDealCount: toBigInt(field(value, 2, "boughtDealCount")),
    loanOfferCount: toBigInt(field(value, 3, "loanOfferCount")),
    dealOfferCount: toBigInt(field(value, 4, "dealOfferCount")),
    lockedUSDC: toBigInt(field(value, 5, "lockedUSDC")),
    activeLoanCount: toBigInt(field(value, 6, "activeLoanCount")),
    activeDealCount: toBigInt(field(value, 7, "activeDealCount")),
    lifetimeVolume: toBigInt(field(value, 8, "lifetimeVolume")),
    activityCount: toBigInt(field(value, 9, "activityCount")),
  };
}

function parseListingSummary(value: unknown): OnChainListingSummary {
  return {
    id: toBigInt(field(value, 0, "id")),
    listing: parseListing(field(value, 1, "listing")),
    escrowBalance: toBigInt(field(value, 2, "escrowBalance")),
    offerCount: toBigInt(field(value, 3, "offerCount")),
    totalDue: toBigInt(field(value, 4, "totalDue")),
    paid: toBigInt(field(value, 5, "paid")),
    remaining: toBigInt(field(value, 6, "remaining")),
    deadline: toBigInt(field(value, 7, "deadline")),
  };
}

function parseDealSummary(value: unknown): OnChainDealSummary {
  return {
    id: toBigInt(field(value, 0, "id")),
    deal: parseDeal(field(value, 1, "deal")),
    kind: Number(field(value, 2, "kind")),
    miniAppId: toBigInt(field(value, 3, "miniAppId")),
    escrowBalance: toBigInt(field(value, 4, "escrowBalance")),
    offerCount: toBigInt(field(value, 5, "offerCount")),
  };
}

// ── NFT loan reads (VaultNFT) ─────────────────────────────────

export async function readListingCount(): Promise<bigint> {
  return client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "listingCount",
  }) as Promise<bigint>;
}

export async function readListing(listingId: bigint): Promise<OnChainListing> {
  const result = await client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "listings",
    args: [listingId],
  });
  return parseListing(result);
}

export async function readAllListings(): Promise<{ id: bigint; data: OnChainListing }[]> {
  const count = await readListingCount();
  const results: { id: bigint; data: OnChainListing }[] = [];
  const batchSize = 20;
  for (let i = BigInt(1); i <= count; i += BigInt(batchSize)) {
    const end = i + BigInt(batchSize - 1) > count ? count : i + BigInt(batchSize - 1);
    const batch = [];
    for (let j = i; j <= end; j++) {
      batch.push(
        readListing(j).then((data) => ({ id: j, data })),
      );
    }
    const batchResults = await Promise.allSettled(batch);
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }
  return results;
}

export async function readRepaymentDue(listingId: bigint): Promise<{ totalDue: bigint; paid: bigint; remaining: bigint }> {
  const result = await client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "getRepaymentDue",
    args: [listingId],
  });
  return {
    totalDue: toBigInt(field(result, 0, "totalDue")),
    paid: toBigInt(field(result, 1, "paid")),
    remaining: toBigInt(field(result, 2, "remaining")),
  };
}

export async function readDeadline(listingId: bigint): Promise<bigint> {
  return client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "getDeadline",
    args: [listingId],
  }) as Promise<bigint>;
}

export async function readOfferCount(listingId: bigint): Promise<bigint> {
  return client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "getOfferCount",
    args: [listingId],
  }) as Promise<bigint>;
}

export async function readOfferLenders(listingId: bigint): Promise<Address[]> {
  return client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "getOfferLenders",
    args: [listingId],
  }) as Promise<Address[]>;
}

export async function readOffer(listingId: bigint, lender: Address): Promise<{ apr: bigint; term: bigint }> {
  const result = await client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "offers",
    args: [listingId, lender],
  });
  return {
    apr: toBigInt(field(result, 0, "apr")),
    term: toBigInt(field(result, 1, "term")),
  };
}

export async function readLenderDeposit(listingId: bigint, lender: Address): Promise<bigint> {
  return client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "lenderDeposits",
    args: [listingId, lender],
  }) as Promise<bigint>;
}

export async function readListingSummary(listingId: bigint): Promise<OnChainListingSummary> {
  const result = await client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "getListingSummary",
    args: [listingId],
  });
  return parseListingSummary(result);
}

export async function readListingsPage(startId: bigint, limit: bigint): Promise<OnChainListingSummary[]> {
  const result = await client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "getListings",
    args: [startId, limit],
  });
  return (result as unknown[]).map(parseListingSummary);
}

export async function readLoanOffer(listingId: bigint, lender: Address): Promise<{ offer: { apr: bigint; term: bigint }; deposit: bigint; active: boolean }> {
  const result = await client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "getLoanOffer",
    args: [listingId, lender],
  });
  const offer = field(result, 0, "offer");
  return {
    offer: {
      apr: toBigInt(field(offer, 0, "apr")),
      term: toBigInt(field(offer, 1, "term")),
    },
    deposit: toBigInt(field(result, 1, "deposit")),
    active: Boolean(field(result, 2, "active")),
  };
}

// ── Deal reads (VaultDeals) ───────────────────────────────────

export async function readDealCount(): Promise<bigint> {
  return client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "dealCount",
  }) as Promise<bigint>;
}

export async function readDeal(dealId: bigint): Promise<OnChainDeal> {
  const result = await client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "deals",
    args: [dealId],
  });
  return parseDeal(result);
}

export async function readAllDeals(): Promise<{ id: bigint; data: OnChainDeal }[]> {
  const count = await readDealCount();
  const results: { id: bigint; data: OnChainDeal }[] = [];
  const batchSize = 20;
  for (let i = BigInt(1); i <= count; i += BigInt(batchSize)) {
    const end = i + BigInt(batchSize - 1) > count ? count : i + BigInt(batchSize - 1);
    const batch = [];
    for (let j = i; j <= end; j++) {
      batch.push(
        readDeal(j).then((data) => ({ id: j, data })),
      );
    }
    const batchResults = await Promise.allSettled(batch);
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }
  return results;
}

export async function readDealEscrowBalance(dealId: bigint): Promise<bigint> {
  return client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "dealEscrowBalance",
    args: [dealId],
  }) as Promise<bigint>;
}

export async function readDealOfferCount(dealId: bigint): Promise<bigint> {
  return client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "getDealOfferCount",
    args: [dealId],
  }) as Promise<bigint>;
}

export async function readDealOfferBuyers(dealId: bigint): Promise<Address[]> {
  return client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "getDealOfferBuyers",
    args: [dealId],
  }) as Promise<Address[]>;
}

export async function readDealOfferDeposit(dealId: bigint, buyer: Address): Promise<bigint> {
  return client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "dealOfferDeposits",
    args: [dealId, buyer],
  }) as Promise<bigint>;
}

export async function readDealSummary(dealId: bigint): Promise<OnChainDealSummary> {
  const result = await client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "getDealSummary",
    args: [dealId],
  });
  return parseDealSummary(result);
}

export async function readDealsPage(startId: bigint, limit: bigint): Promise<OnChainDealSummary[]> {
  const result = await client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "getDeals",
    args: [startId, limit],
  });
  return (result as unknown[]).map(parseDealSummary);
}

export async function readMiniAppDeal(miniAppId: bigint): Promise<OnChainDealSummary> {
  const result = await client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "getMiniAppDeal",
    args: [miniAppId],
  });
  return parseDealSummary(result);
}

export async function readDealOffer(dealId: bigint, buyer: Address): Promise<{ deposit: bigint; active: boolean }> {
  const result = await client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "getDealOffer",
    args: [dealId, buyer],
  });
  return {
    deposit: toBigInt(field(result, 0, "deposit")),
    active: Boolean(field(result, 1, "active")),
  };
}

// ── Shared (read from VaultNFT) ───────────────────────────────

export async function readPlatformFeeBps(kind: "nft" | "deals" = "nft"): Promise<number> {
  const fee = await client().readContract({
    address: kind === "nft" ? await nftAddress() : await dealsAddress(),
    abi: kind === "nft" ? VaultNFT_ABI : VaultDeals_ABI,
    functionName: "platformFeeBps",
  }) as bigint;
  return Number(fee);
}

export async function readPaused(): Promise<boolean> {
  return client().readContract({
    address: await nftAddress(),
    abi: VaultNFT_ABI,
    functionName: "paused",
  }) as Promise<boolean>;
}

export async function readPausedDeals(): Promise<boolean> {
  return client().readContract({
    address: await dealsAddress(),
    abi: VaultDeals_ABI,
    functionName: "paused",
  }) as Promise<boolean>;
}

export async function readIsVaultAdmin(address: Address): Promise<boolean> {
  const [nft, deals] = await Promise.allSettled([
    client().readContract({
      address: await nftAddress(),
      abi: VaultNFT_ABI,
      functionName: "admins",
      args: [address],
    }) as Promise<boolean>,
    client().readContract({
      address: await dealsAddress(),
      abi: VaultDeals_ABI,
      functionName: "admins",
      args: [address],
    }) as Promise<boolean>,
  ]);
  return (
    (nft.status === "fulfilled" && nft.value) ||
    (deals.status === "fulfilled" && deals.value)
  );
}

export async function readIsAdmin(kind: "nft" | "deals", address: Address): Promise<boolean> {
  return client().readContract({
    address: kind === "nft" ? await nftAddress() : await dealsAddress(),
    abi: kind === "nft" ? VaultNFT_ABI : VaultDeals_ABI,
    functionName: "isAdmin",
    args: [address],
  }) as Promise<boolean>;
}

export async function readIsOfferNonceUnavailable(kind: "nft" | "deals", signer: Address, nonce: bigint): Promise<boolean> {
  return client().readContract({
    address: kind === "nft" ? await nftAddress() : await dealsAddress(),
    abi: kind === "nft" ? VaultNFT_ABI : VaultDeals_ABI,
    functionName: "isOfferNonceUnavailable",
    args: [signer, nonce],
  }) as Promise<boolean>;
}

export async function readUserProfile(kind: "nft" | "deals", user: Address): Promise<OnChainUserProfile> {
  const result = await client().readContract({
    address: kind === "nft" ? await nftAddress() : await dealsAddress(),
    abi: kind === "nft" ? VaultNFT_ABI : VaultDeals_ABI,
    functionName: "getUserProfile",
    args: [user],
  });
  return parseUserProfile(result);
}

export async function readUserActivities(kind: "nft" | "deals", user: Address, offset = BigInt(0), limit = BigInt(25)): Promise<OnChainActivity[]> {
  const result = await client().readContract({
    address: kind === "nft" ? await nftAddress() : await dealsAddress(),
    abi: kind === "nft" ? VaultNFT_ABI : VaultDeals_ABI,
    functionName: "getUserActivities",
    args: [user, offset, limit],
  });
  return (result as unknown[]).map(parseActivity);
}

export async function readUserIdPage(
  kind: "nft" | "deals",
  functionName:
    | "getUserNftListingIds"
    | "getUserDealIds"
    | "getUserBoughtDealIds"
    | "getUserLoanOfferListingIds"
    | "getUserDealOfferIds",
  user: Address,
  offset = BigInt(0),
  limit = BigInt(25),
): Promise<bigint[]> {
  const result = await client().readContract({
    address: kind === "nft" ? await nftAddress() : await dealsAddress(),
    abi: kind === "nft" ? VaultNFT_ABI : VaultDeals_ABI,
    functionName,
    args: [user, offset, limit],
  });
  return (result as unknown[]).map(toBigInt);
}

// ── Stage mapping ────────────────────────────────────────────

export type EscrowStage =
  | "not_listed"
  | "listed"
  | "funded"
  | "active"
  | "repaid"
  | "defaulted"
  | "cancelled"
  | "disputed";

export function mapListingStage(stage: number): EscrowStage {
  const stages: EscrowStage[] = ["listed", "funded", "active", "repaid", "defaulted", "cancelled", "disputed"];
  return stages[stage] ?? "not_listed";
}

export type DealStage =
  | "not_listed"
  | "listed"
  | "funds_locked"
  | "asset_transferred"
  | "released"
  | "disputed"
  | "resolved"
  | "refunded"
  | "cancelled";

export function mapDealStage(stage: number): DealStage {
  const stages: DealStage[] = ["listed", "funds_locked", "asset_transferred", "released", "disputed", "resolved", "refunded", "cancelled"];
  return stages[stage] ?? "not_listed";
}
