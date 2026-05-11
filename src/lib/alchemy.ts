const BASE_URL = "https://base-mainnet.g.alchemy.com/nft/v3";
const ETH_URL = "https://eth-mainnet.g.alchemy.com/nft/v3";

function getApiKey() {
  return process.env.NEXT_PUBLIC_ALCHEMY_KEY || "";
}

async function alchemyFetch(chain: "base" | "eth", endpoint: string, params: Record<string, string>) {
  const key = getApiKey();
  if (!key) throw new Error("Missing NEXT_PUBLIC_ALCHEMY_KEY");
  const base = chain === "base" ? BASE_URL : ETH_URL;
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${base}/${endpoint}?${qs}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Alchemy error: ${res.status}`);
  return res.json();
}

export interface AlchemyNFT {
  contract: { address: string; name?: string };
  tokenId: string;
  name?: string;
  image?: { cachedUrl?: string; thumbnailUrl?: string };
  floorPriceEth?: number;
  collection?: { name?: string; slug?: string };
}

/** Get all NFTs owned by a wallet */
export async function getNFTsForOwner(address: string, chain: "base" | "eth" = "base") {
  const data = await alchemyFetch(chain, "getNFTsForOwner", {
    owner: address,
    withMetadata: "true",
    pageSize: "50",
  });
  return (data.ownedNfts || []) as AlchemyNFT[];
}

/** Get floor price for a collection */
export async function getFloorPrice(contractAddress: string, chain: "base" | "eth" = "base") {
  const key = getApiKey();
  if (!key) return null;
  const base = chain === "base" ? BASE_URL : ETH_URL;
  const res = await fetch(`${base}/getFloorPrice?contractAddress=${contractAddress}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.openSea?.floorPrice || data.looksRare?.floorPrice || null;
}

/** Get NFT metadata */
export async function getNFTMetadata(contractAddress: string, tokenId: string, chain: "base" | "eth" = "base") {
  return alchemyFetch(chain, "getNFTMetadata", { contractAddress, tokenId });
}
