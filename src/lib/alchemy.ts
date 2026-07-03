const BASE_URL = "https://base-mainnet.g.alchemy.com/nft/v3";
const ETH_URL = "https://eth-mainnet.g.alchemy.com/nft/v3";

export class AlchemyConfigError extends Error {
  constructor(message = "Missing ALCHEMY_KEY") {
    super(message);
    this.name = "AlchemyConfigError";
  }
}

function getApiKey() {
  return process.env.ALCHEMY_KEY || "";
}

async function alchemyFetch(chain: "base" | "eth", endpoint: string, params: Record<string, string>) {
  const key = getApiKey();
  if (!key) throw new AlchemyConfigError();
  const base = chain === "base" ? BASE_URL : ETH_URL;
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${base}/${key}/${endpoint}?${qs}`);
  if (!res.ok) throw new Error(`Alchemy error: ${res.status}`);
  return res.json();
}

export interface AlchemyNFT {
  contract: { address: string; name?: string };
  tokenId: string;
  name?: string;
  image?: { cachedUrl?: string; thumbnailUrl?: string; pngUrl?: string; originalUrl?: string };
  raw?: { metadata?: { image?: string; image_url?: string; imageUrl?: string; animation_url?: string } };
  media?: Array<{ gateway?: string; thumbnail?: string; raw?: string }>;
  floorPriceEth?: number;
  collection?: { name?: string; slug?: string };
  transferable?: boolean;
}

export async function getNFTsForOwner(address: string, chain: "base" | "eth" = "base") {
  const data = await alchemyFetch(chain, "getNFTsForOwner", {
    owner: address,
    withMetadata: "true",
    pageSize: "50",
  });
  return (data.ownedNfts || []) as AlchemyNFT[];
}

export async function getFloorPrice(contractAddress: string, chain: "base" | "eth" = "base") {
  const key = getApiKey();
  if (!key) return null;
  const base = chain === "base" ? BASE_URL : ETH_URL;
  const res = await fetch(`${base}/${key}/getFloorPrice?contractAddress=${contractAddress}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.openSea?.floorPrice || data.looksRare?.floorPrice || null;
}

export async function getNFTMetadata(contractAddress: string, tokenId: string, chain: "base" | "eth" = "base") {
  return alchemyFetch(chain, "getNFTMetadata", { contractAddress, tokenId });
}
