import { type Address } from "viem";
import { getPublicClient, getEscrowAddress } from "./contract-helpers";
import { ESCROW_ABI } from "./contract-abi";

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

function client() {
  return getPublicClient();
}

function address() {
  return getEscrowAddress();
}

export async function readListingCount(): Promise<bigint> {
  return client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "listingCount",
  }) as Promise<bigint>;
}

export async function readListing(listingId: bigint): Promise<OnChainListing> {
  const result = await client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "listings",
    args: [listingId],
  });
  const arr = result as unknown[] | readonly unknown[];
  return {
    borrower: arr[0] as Address,
    nftContract: arr[1] as Address,
    nftTokenId: BigInt(arr[2] as string | number | bigint),
    principal: BigInt(arr[3] as string | number | bigint),
    apr: BigInt(arr[4] as string | number | bigint),
    term: BigInt(arr[5] as string | number | bigint),
    acceptedLender: arr[6] as Address,
    acceptedAmount: BigInt(arr[7] as string | number | bigint),
    acceptedApr: BigInt(arr[8] as string | number | bigint),
    acceptedTerm: BigInt(arr[9] as string | number | bigint),
    fundedAt: BigInt(arr[10] as string | number | bigint),
    repaidSoFar: BigInt(arr[11] as string | number | bigint),
    stage: Number(arr[12]),
  };
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
    address: address(),
    abi: ESCROW_ABI,
    functionName: "getRepaymentDue",
    args: [listingId],
  });
  const arr = result as unknown[] | readonly unknown[];
  return {
    totalDue: BigInt(arr[0] as string | number | bigint),
    paid: BigInt(arr[1] as string | number | bigint),
    remaining: BigInt(arr[2] as string | number | bigint),
  };
}

export async function readDeadline(listingId: bigint): Promise<bigint> {
  return client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "getDeadline",
    args: [listingId],
  }) as Promise<bigint>;
}

export async function readOfferCount(listingId: bigint): Promise<bigint> {
  return client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "getOfferCount",
    args: [listingId],
  }) as Promise<bigint>;
}

export async function readOffer(listingId: bigint, lender: Address): Promise<{ apr: bigint; term: bigint }> {
  const result = await client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "offers",
    args: [listingId, lender],
  });
  const arr = result as unknown[] | readonly unknown[];
  return {
    apr: BigInt(arr[0] as string | number | bigint),
    term: BigInt(arr[1] as string | number | bigint),
  };
}

export async function readLenderDeposit(listingId: bigint, lender: Address): Promise<bigint> {
  return client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "lenderDeposits",
    args: [listingId, lender],
  }) as Promise<bigint>;
}

export async function readDealCount(): Promise<bigint> {
  return client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "dealCount",
  }) as Promise<bigint>;
}

export async function readDeal(dealId: bigint): Promise<OnChainDeal> {
  const result = await client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "deals",
    args: [dealId],
  });
  const arr = result as unknown[] | readonly unknown[];
  return {
    seller: arr[0] as Address,
    buyer: arr[1] as Address,
    price: BigInt(arr[2] as string | number | bigint),
    metadataHash: arr[3] as `0x${string}`,
    deadline: BigInt(arr[4] as string | number | bigint),
    createdAt: BigInt(arr[5] as string | number | bigint),
    stage: Number(arr[6]),
    buyerAmount: BigInt(arr[7] as string | number | bigint),
    sellerAmount: BigInt(arr[8] as string | number | bigint),
  };
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
    address: address(),
    abi: ESCROW_ABI,
    functionName: "dealEscrowBalance",
    args: [dealId],
  }) as Promise<bigint>;
}

export async function readPaused(): Promise<boolean> {
  return client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "paused",
  }) as Promise<boolean>;
}

// ── Deal offer readers ───────────────────────────────────────

export async function readDealOfferCount(dealId: bigint): Promise<bigint> {
  return client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "getDealOfferCount",
    args: [dealId],
  }) as Promise<bigint>;
}

export async function readDealOfferBuyers(dealId: bigint): Promise<Address[]> {
  return client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "getDealOfferBuyers",
    args: [dealId],
  }) as Promise<Address[]>;
}

export async function readDealOfferDeposit(dealId: bigint, buyer: Address): Promise<bigint> {
  return client().readContract({
    address: address(),
    abi: ESCROW_ABI,
    functionName: "dealOfferDeposits",
    args: [dealId, buyer],
  }) as Promise<bigint>;
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
  // Contract Stage enum: LISTED=0, FUNDED=1, ACTIVE=2, REPAID=3, DEFAULTED=4, CANCELLED=5, DISPUTED=6
  const stages: EscrowStage[] = ["listed", "funded", "active", "repaid", "defaulted", "cancelled", "disputed"];
  return stages[stage] ?? "not_listed";
}

// DealStage enum order (no VERIFIED):
//   0 = LISTED, 1 = FUNDED, 2 = DELIVERED, 3 = CONFIRMED,
//   4 = DISPUTED, 5 = RESOLVED, 6 = REFUNDED, 7 = CANCELLED
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
