export interface ClankerToken {
  id: string;
  name: string;
  symbol: string;
  tokenAddress: string;
  chain: string;
  totalSupply: number;
  remainingSupply: number;
  vaultedAmount: number;
  vaultUnlock: string;
  feeEarnings: number;
  price: number;
  poolAddress: string;
  imageUrl?: string;
  verified: boolean;
  sellerAddress?: string;
  chainId?: number;
  contractAddress?: string;
  contractListingId?: string;
  txHash?: string;
  txStatus?: string;
}

export type BundleAssetKind = "nft_loan" | "mini_app" | "x_account" | "farcaster" | "clanker";

export interface BundleAsset {
  id: string;
  kind: BundleAssetKind;
  label: string;
  detail: string;
  price: number;
  data: Record<string, unknown>;
}

export interface BundleListing {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  assets: BundleAsset[];
  totalPrice: number;
  currency: string;
  sellerAddress: string;
  chainId?: number;
  contractAddress?: string;
  contractListingId?: string;
  txHash?: string;
  txStatus?: string;
  createdAt: string;
}

const DISPLAY_KINDS: Record<BundleAssetKind, string> = {
  nft_loan: "NFT Loan",
  mini_app: "Mini App",
  x_account: "X Account",
  farcaster: "Farcaster FID",
  clanker: "Clanker Token",
};

export function asBundleAssetKind(s: unknown): BundleAssetKind {
  const map: Record<string, BundleAssetKind> = {
    nft_loan: "nft_loan",
    mini_app: "mini_app", x_account: "x_account",
    farcaster: "farcaster", clanker: "clanker",
  };
  return map[String(s)] || "mini_app";
}

export function bundleAssetLabel(kind: BundleAssetKind): string {
  return DISPLAY_KINDS[kind] || kind;
}

export const COLLECTIONS = [
  "Meridian Genesis", "Aperture", "Hollow Forms", "Cipher Drones",
  "Solene Mirrors", "Halo Pass", "Strata Index", "Veil Quartet",
] as const;

export interface Loan {
  id: string;
  coll: number;
  token: string;
  amt: number;
  apr: number;
  term: number;
  ltv: number;
  status: "open" | "funded" | "repaid" | "warn" | "default" | "disputed" | "cancelled";
  bid: number;
  value: number;
  borrower: string;
  imageUrl?: string;
  chainId?: number;
  contractAddress?: string;
  contractListingId?: string;
  txHash?: string;
  txStatus?: string;
}

export interface DigitalDeal {
  id: string;
  name: string;
  type: string;
  price: number;
  mrr: number;
  chain: string;
  includes: string[];
  sellerAddress?: string;
  chainId?: number;
  contractAddress?: string;
  contractListingId?: string;
  txHash?: string;
  txStatus?: string;
}

export interface Escrow {
  id: string;
  kind: string;
  party: string;
  asset: string;
  amount: number;
  asset_type: string;
  deadline: string;
  stage: string;
  action: string;
}

export interface XAccount {
  id: string;
  handle: string;
  followers: number;
  niche: string;
  price: number;
  age: string;
  engagement: number;
  posts_30d: number;
  growth: string;
  imageUrl?: string;
  sellerAddress?: string;
  chainId?: number;
  contractAddress?: string;
  contractListingId?: string;
  txHash?: string;
  txStatus?: string;
  includes?: string[];
}

export interface FarcasterAccount {
  id: string;
  handle: string;
  fid: number;
  followers: number;
  channel: string;
  price: number;
  casts_30d: number;
  power_badge: boolean;
  rev_30d: number;
  imageUrl?: string;
  sellerAddress?: string;
  chainId?: number;
  contractAddress?: string;
  contractListingId?: string;
  txHash?: string;
  txStatus?: string;
  includes?: string[];
}

export interface MiniApp {
  id: string;
  name: string;
  kind: string;
  dau: number;
  mrr: number;
  price: number;
  stack: string[];
  source: boolean;
  age: string;
  imageUrl?: string;
  sellerAddress?: string;
  chainId?: number;
  contractAddress?: string;
  contractListingId?: string;
  txHash?: string;
  txStatus?: string;
  includes?: string[];
  description?: string;
}
