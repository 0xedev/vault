import { asNumber, jsonRecord } from "@/lib/api";
import type { ListingRow } from "@/lib/marketplace";

const DEFAULT_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/103701/vault/v0.0.2";
const USDC_DECIMALS = 1_000_000;

type GraphAccount = {
  id: string;
  address?: string;
};

export type SubgraphNftListing = {
  id: string;
  listingId: string;
  contract: string;
  seller: GraphAccount;
  nftContract: string;
  tokenId: string;
  amount: string;
  apr: string;
  term: string;
  status: string;
  acceptedLender?: GraphAccount | null;
  acceptedAmount?: string | null;
  repaidAmount: string;
  createdAt: string;
  createdAtBlock: string;
  updatedAt: string;
  updatedAtBlock: string;
};

export type SubgraphDealListing = {
  id: string;
  dealId: string;
  contract: string;
  seller: GraphAccount;
  buyer?: GraphAccount | null;
  price: string;
  metadataHash: string;
  kind: string;
  status: string;
  deadline?: string | null;
  buyerAmount: string;
  sellerAmount: string;
  createdAt: string;
  createdAtBlock: string;
  updatedAt: string;
  updatedAtBlock: string;
};

type SubgraphActivity = {
  id: string;
  action: string;
  listingType: string;
  listingId: string;
  activityId?: string | null;
  actionCode?: number | null;
  marketCode?: number | null;
  subjectId?: string | null;
  actor?: GraphAccount | null;
  counterparty?: GraphAccount | null;
  amount?: string | null;
  statusCode?: number | null;
  metadataHash?: string | null;
  timestamp: string;
  blockNumber: string;
};

type GraphResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

function subgraphUrl() {
  if (process.env.SUBGRAPH_URL) return process.env.SUBGRAPH_URL;
  if (process.env.SUBGRAPH_DEPLOYMENT_ID) {
    return `https://gateway.thegraph.com/api/deployments/id/${process.env.SUBGRAPH_DEPLOYMENT_ID}`;
  }
  return DEFAULT_SUBGRAPH_URL;
}

function subgraphHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env.SUBGRAPH_API_KEY || process.env.GRAPH_API_KEY;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function isSubgraphConfigured() {
  return Boolean(subgraphUrl());
}

export async function subgraphRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  const url = subgraphUrl();
  if (!url) return null;

  const res = await fetch(url, {
    method: "POST",
    headers: subgraphHeaders(),
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 10 },
  });

  const json = await res.json().catch(() => ({})) as GraphResponse<T>;
  if (!res.ok || json.errors?.length) {
    const detail = json.errors?.map((error) => error.message).join("; ") || res.statusText;
    throw new Error(`Subgraph query failed: ${detail}`);
  }
  return json.data || null;
}

function accountAddress(account?: GraphAccount | null) {
  return (account?.address || account?.id || "").toLowerCase();
}

function statusForNftListing(status: string) {
  if (status === "listed") return "active";
  if (status === "repaid" || status === "resolved") return "completed";
  if (status === "defaulted") return "funded";
  return status || "active";
}

function collateralStatusForNftListing(status: string) {
  if (status === "listed") return "open";
  if (status === "defaulted") return "default";
  return status || "open";
}

function statusForDealListing(status: string) {
  if (status === "listed") return "active";
  if (status === "released" || status === "resolved") return "completed";
  if (status === "funds_locked" || status === "asset_transferred") return "funded";
  return status || "active";
}

function marketplaceForDealKind(kind: string, existing?: ListingRow) {
  const existingMarketplace = String(existing?.marketplace || "");
  if (existingMarketplace) return existingMarketplace;
  if (["mini_app", "x_account", "farcaster", "clanker", "bundle", "otc"].includes(kind)) return kind;
  return "otc";
}

function rowKey(row: ListingRow) {
  const contract = String(row.contract_address || "").toLowerCase();
  const listingId = String(row.contract_listing_id || "");
  return contract && listingId ? `${contract}:${listingId}` : "";
}

function mergeCollateral(existing: unknown, indexed: Record<string, unknown>) {
  return JSON.stringify({
    ...indexed,
    ...jsonRecord(existing),
    status: indexed.status,
  });
}

export function nftListingRowFromSubgraph(listing: SubgraphNftListing, existing?: ListingRow): ListingRow {
  const collection = `${listing.nftContract.slice(0, 6)}...${listing.nftContract.slice(-4)}`;
  return {
    ...(existing || {}),
    id: existing?.id || `C-${listing.listingId}`,
    seller_address: accountAddress(listing.seller),
    marketplace: "nft_loan",
    title: existing?.title || `${collection} #${listing.tokenId}`,
    price: Number(listing.amount) / USDC_DECIMALS,
    collateral_data: mergeCollateral(existing?.collateral_data, {
      collection,
      token: listing.tokenId,
      tokenId: listing.tokenId,
      nftContract: listing.nftContract,
      apr: Number(listing.apr) / 100,
      term: Number(listing.term),
      status: collateralStatusForNftListing(listing.status),
      value: asNumber(jsonRecord(existing?.collateral_data).value),
      imageUrl: String(jsonRecord(existing?.collateral_data).imageUrl || ""),
    }),
    status: statusForNftListing(listing.status),
    moderation_status: "approved",
    chain_id: 8453,
    contract_address: listing.contract,
    contract_listing_id: listing.listingId,
    tx_status: "indexed",
    created_at: new Date(Number(listing.createdAt) * 1000).toISOString(),
    updated_at: new Date(Number(listing.updatedAt) * 1000).toISOString(),
  };
}

export function dealListingRowFromSubgraph(listing: SubgraphDealListing, existing?: ListingRow): ListingRow {
  const marketplace = marketplaceForDealKind(listing.kind, existing);
  return {
    ...(existing || {}),
    id: existing?.id || `D-${listing.dealId}`,
    seller_address: accountAddress(listing.seller),
    marketplace,
    title: existing?.title || (marketplace === "mini_app" ? `Mini app #${listing.dealId}` : `Deal #${listing.dealId}`),
    price: Number(listing.price) / USDC_DECIMALS,
    collateral_data: mergeCollateral(existing?.collateral_data, {
      name: existing?.title || (marketplace === "mini_app" ? `Mini app #${listing.dealId}` : `Deal #${listing.dealId}`),
      kind: marketplace === "mini_app" ? "Mini App" : "Asset sale",
      metadataHash: listing.metadataHash,
      status: listing.status,
    }),
    status: statusForDealListing(listing.status),
    moderation_status: "approved",
    chain_id: 8453,
    contract_address: existing?.contract_address || listing.contract,
    contract_listing_id: listing.dealId,
    tx_status: "indexed",
    created_at: new Date(Number(listing.createdAt) * 1000).toISOString(),
    updated_at: new Date(Number(listing.updatedAt) * 1000).toISOString(),
  };
}

export function mergeIndexedListingRows(dbRows: ListingRow[], indexedRows: ListingRow[]) {
  const byKey = new Map<string, ListingRow>();
  for (const row of dbRows) {
    const key = rowKey(row);
    if (key) byKey.set(key, row);
  }

  const merged: ListingRow[] = [];
  const seen = new Set<string>();
  for (const indexed of indexedRows) {
    const key = rowKey(indexed);
    const existing = key ? byKey.get(key) : undefined;
    merged.push({ ...(existing || {}), ...indexed, id: existing?.id || indexed.id });
    if (key) seen.add(key);
  }

  for (const row of dbRows) {
    const key = rowKey(row);
    if (!key || !seen.has(key)) merged.push(row);
  }
  return merged;
}

const NFT_LISTING_FIELDS = `
  id listingId contract nftContract tokenId amount apr term status repaidAmount
  createdAt createdAtBlock updatedAt updatedAtBlock
  seller { id address }
  acceptedLender { id address }
  acceptedAmount
`;

const DEAL_LISTING_FIELDS = `
  id dealId contract price metadataHash kind status deadline buyerAmount sellerAmount
  createdAt createdAtBlock updatedAt updatedAtBlock
  seller { id address }
  buyer { id address }
`;

export async function fetchIndexedNftListings(args: { sellerAddress?: string; limit?: number } = {}) {
  const first = args.limit || 100;
  const where = args.sellerAddress
    ? { seller: args.sellerAddress.toLowerCase() }
    : {};
  const result = await subgraphRequest<{ nftListings: SubgraphNftListing[] }>(`
    query NftListings($first: Int!, $where: NftListing_filter!) {
      nftListings(first: $first, orderBy: updatedAtBlock, orderDirection: desc, where: $where) {
        ${NFT_LISTING_FIELDS}
      }
    }
  `, { first, where });
  return result?.nftListings || [];
}

export async function fetchIndexedNftListingById(listingId: string) {
  const result = await subgraphRequest<{ nftListings: SubgraphNftListing[] }>(`
    query NftListing($listingId: BigInt!) {
      nftListings(first: 1, where: { listingId: $listingId }) {
        ${NFT_LISTING_FIELDS}
      }
    }
  `, { listingId });
  return result?.nftListings?.[0] || null;
}

export async function fetchIndexedDealListings(args: { sellerAddress?: string; kind?: string; limit?: number } = {}) {
  const where: Record<string, unknown> = {};
  if (args.sellerAddress) where.seller = args.sellerAddress.toLowerCase();
  if (args.kind) where.kind = args.kind;
  const result = await subgraphRequest<{ dealListings: SubgraphDealListing[] }>(`
    query DealListings($first: Int!, $where: DealListing_filter!) {
      dealListings(first: $first, orderBy: updatedAtBlock, orderDirection: desc, where: $where) {
        ${DEAL_LISTING_FIELDS}
      }
    }
  `, { first: args.limit || 100, where });
  return result?.dealListings || [];
}

export async function fetchIndexedUserProfile(address: string) {
  const id = address.toLowerCase();
  const result = await subgraphRequest<{
    account: {
      id: string;
      address: string;
      nftListings: Pick<SubgraphNftListing, "id" | "status" | "amount">[];
      dealListings: Pick<SubgraphDealListing, "id" | "status" | "price" | "buyerAmount" | "sellerAmount">[];
      activities: SubgraphActivity[];
    } | null;
    boughtDeals: Pick<SubgraphDealListing, "id" | "status" | "price" | "buyerAmount" | "sellerAmount">[];
  }>(`
    query UserProfile($id: ID!) {
      account(id: $id) {
        id
        address
        nftListings(first: 100) { id status amount }
        dealListings(first: 100) { id status price buyerAmount sellerAmount }
        activities(first: 100, orderBy: timestamp, orderDirection: desc) {
          id
          action
          listingType
          listingId
          activityId
          actionCode
          marketCode
          subjectId
          actor { id address }
          counterparty { id address }
          amount
          statusCode
          metadataHash
          timestamp
          blockNumber
        }
      }
      boughtDeals: dealListings(first: 100, where: { buyer: $id }) {
        id status price buyerAmount sellerAmount
      }
    }
  `, { id });

  const account = result?.account;
  const boughtDeals = result?.boughtDeals || [];
  const sellerDeals = account?.dealListings || [];
  const activeDealStatuses = new Set(["funds_locked", "asset_transferred", "disputed"]);
  const lockedBalance = [...sellerDeals, ...boughtDeals]
    .filter((deal) => activeDealStatuses.has(deal.status))
    .reduce((sum, deal) => sum + Number(deal.buyerAmount || deal.price || 0) / USDC_DECIMALS, 0);

  return {
    address: account?.address || id,
    indexedTrades: account?.activities?.length || 0,
    indexedListings: (account?.nftListings?.length || 0) + sellerDeals.length,
    indexedLockedBalance: lockedBalance,
    activities: account?.activities || [],
  };
}
