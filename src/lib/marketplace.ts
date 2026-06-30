import { COLLECTIONS, type BundleListing, type BundleAsset, bundleAssetLabel, asBundleAssetKind } from "@/lib/data";
import { asBoolean, asNumber, asString, jsonArray, jsonRecord, shortAddress } from "@/lib/api";

export type ListingRow = Record<string, unknown>;

function collectionIndex(name: string): number {
  const index = COLLECTIONS.findIndex((collection) => collection.toLowerCase() === name.toLowerCase());
  return index >= 0 ? index : 0;
}

function loanStatus(row: ListingRow, data: Record<string, unknown>) {
  const stored = asString(data.status);
  if (stored) return stored;
  const status = asString(row.status);
  if (status === "funded") return "funded";
  if (status === "completed") return "repaid";
  if (status === "disputed") return "disputed";
  return "open";
}

export function mapLoanListing(row: ListingRow) {
  const data = jsonRecord(row.collateral_data);
  const title = asString(row.title, "Untitled collateral");
  const collection = asString(data.collection, title.replace(/\s+#?\d+.*/, ""));
  return {
    id: String(row.id),
    coll: asNumber(data.coll, collectionIndex(collection)),
    collection,
    token: asString(data.token, asString(data.tokenId, "")),
    amt: asNumber(row.price),
    apr: asNumber(data.apr),
    term: asNumber(data.term),
    ltv: asNumber(data.ltv),
    status: loanStatus(row, data),
    bid: asNumber(data.bid),
    value: asNumber(data.value),
    borrower: shortAddress(row.seller_address),
    imageUrl: asString(data.imageUrl),
    sellerAddress: String(row.seller_address || ""),
    chainId: asNumber(row.chain_id),
    contractAddress: asString(row.contract_address),
    contractListingId: asString(row.contract_listing_id),
    txHash: asString(row.tx_hash),
    txStatus: asString(row.tx_status, "offchain"),
  };
}

export function mapMiniAppListing(row: ListingRow) {
  const data = jsonRecord(row.collateral_data);
  return {
    id: String(row.id),
    name: asString(data.name, asString(row.title, "Untitled app")),
    kind: asString(data.kind, "Mini App"),
    dau: asNumber(data.dau),
    mrr: asNumber(data.mrr),
    price: asNumber(row.price),
    stack: jsonArray(data.stack).map(String),
    source: asBoolean(data.source, false),
    age: asString(data.age, "New"),
    imageUrl: asString(data.imageUrl),
    includes: jsonArray(data.includes).map(String),
    sellerAddress: String(row.seller_address || ""),
    chainId: asNumber(row.chain_id),
    contractAddress: asString(row.contract_address),
    contractListingId: asString(row.contract_listing_id),
    txHash: asString(row.tx_hash),
    txStatus: asString(row.tx_status, "offchain"),
  };
}

export function mapXAccountListing(row: ListingRow) {
  const data = jsonRecord(row.collateral_data);
  return {
    id: String(row.id),
    handle: asString(data.handle, asString(row.title, "")),
    followers: asNumber(data.followers),
    niche: asString(data.niche, "Uncategorized"),
    price: asNumber(row.price),
    age: asString(data.age),
    engagement: asNumber(data.engagement),
    posts_30d: asNumber(data.posts_30d),
    growth: asString(data.growth, "0%"),
    imageUrl: asString(data.imageUrl),
    includes: jsonArray(data.includes).map(String),
    sellerAddress: String(row.seller_address || ""),
    chainId: asNumber(row.chain_id),
    contractAddress: asString(row.contract_address),
    contractListingId: asString(row.contract_listing_id),
    txHash: asString(row.tx_hash),
    txStatus: asString(row.tx_status, "offchain"),
  };
}

export function mapFarcasterListing(row: ListingRow) {
  const data = jsonRecord(row.collateral_data);
  return {
    id: String(row.id),
    handle: asString(data.handle, asString(row.title, "").replace(/^@/, "")),
    fid: asNumber(data.fid),
    followers: asNumber(data.followers),
    channel: asString(data.channel, ""),
    price: asNumber(row.price),
    casts_30d: asNumber(data.casts_30d),
    power_badge: asBoolean(data.power_badge),
    rev_30d: asNumber(data.rev_30d),
    imageUrl: asString(data.imageUrl),
    includes: jsonArray(data.includes).map(String),
    sellerAddress: String(row.seller_address || ""),
    chainId: asNumber(row.chain_id),
    contractAddress: asString(row.contract_address),
    contractListingId: asString(row.contract_listing_id),
    txHash: asString(row.tx_hash),
    txStatus: asString(row.tx_status, "offchain"),
  };
}

export function mapDigitalDeal(row: ListingRow) {
  const data = jsonRecord(row.collateral_data);
  return {
    id: String(row.id),
    name: asString(data.name, asString(row.title, "Untitled deal")),
    type: asString(data.kind, asString(data.type, "Asset sale")),
    price: asNumber(row.price),
    mrr: asNumber(data.mrr),
    chain: asString(data.chain, "Base"),
    includes: jsonArray(data.includes).map(String),
    sellerAddress: String(row.seller_address || ""),
    chainId: asNumber(row.chain_id),
    contractAddress: asString(row.contract_address),
    contractListingId: asString(row.contract_listing_id),
    txHash: asString(row.tx_hash),
    txStatus: asString(row.tx_status, "offchain"),
  };
}

export function mapClankerListing(row: ListingRow) {
  const data = jsonRecord(row.collateral_data);
  return {
    id: String(row.id),
    name: asString(data.name, asString(row.title, "Untitled token")),
    symbol: asString(data.symbol, ""),
    tokenAddress: asString(data.tokenAddress, asString(row.contract_address, "")),
    chain: asString(data.chain, asString(row.chain_id, "Base")),
    totalSupply: asNumber(data.totalSupply),
    remainingSupply: asNumber(data.remainingSupply),
    vaultedAmount: asNumber(data.vaultedAmount),
    vaultUnlock: asString(data.vaultUnlock, ""),
    feeEarnings: asNumber(data.feeEarnings),
    price: asNumber(row.price),
    poolAddress: asString(data.poolAddress, ""),
    imageUrl: asString(data.imageUrl),
    verified: asBoolean(data.verified, row.status === "funded" || row.status === "completed"),
    sellerAddress: String(row.seller_address || ""),
    chainId: asNumber(row.chain_id),
    contractAddress: asString(row.contract_address),
    contractListingId: asString(row.contract_listing_id),
    txHash: asString(row.tx_hash),
    txStatus: asString(row.tx_status, "offchain"),
  };
}

export function mapBundleListing(row: ListingRow): BundleListing {
  const data = jsonRecord(row.collateral_data);
  const rawAssets = jsonArray(row.listing_assets_data || data.assets);
  const assets: BundleAsset[] = rawAssets.map((a: unknown, i: number) => {
    const asset = a as Record<string, unknown> || {};
    const kind = asBundleAssetKind(asset.assetType || asset.kind);
    const assetData = jsonRecord(asset.assetData || asset.data);
    return {
      id: asString(asset.id, `${kind}-${i}`),
      kind,
      label: asString(assetData.label || assetData.name || assetData.title || assetData.handle || `${bundleAssetLabel(kind)} #${i + 1}`),
      detail: asString(assetData.detail || assetData.description || ""),
      price: asNumber(assetData.price || asset.price || 0),
      data: assetData,
    };
  });

  return {
    id: String(row.id),
    name: asString(data.name || row.title, "Bundle"),
    description: asString(row.description || data.description, ""),
    imageUrl: asString(data.imageUrl),
    assets,
    totalPrice: asNumber(row.price),
    currency: asString(row.currency, "USDC"),
    sellerAddress: String(row.seller_address || ""),
    chainId: asNumber(row.chain_id),
    contractAddress: asString(row.contract_address),
    contractListingId: asString(row.contract_listing_id),
    txHash: asString(row.tx_hash),
    txStatus: asString(row.tx_status, "offchain"),
    createdAt: asString(row.created_at, ""),
  };
}

export { asBundleAssetKind, bundleAssetLabel } from "@/lib/data";
