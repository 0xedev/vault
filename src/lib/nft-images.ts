export type NftImageFields = {
  image?: {
    cachedUrl?: string | null;
    thumbnailUrl?: string | null;
    pngUrl?: string | null;
    originalUrl?: string | null;
  } | null;
  raw?: {
    metadata?: {
      image?: string | null;
      image_url?: string | null;
      imageUrl?: string | null;
      animation_url?: string | null;
    } | null;
  } | null;
  media?: Array<{ gateway?: string | null; thumbnail?: string | null; raw?: string | null }> | null;
  tokenUri?: string | null;
};

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

export function normalizeNftImageUrl(url?: string | null) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("ipfs://ipfs/")) return `${IPFS_GATEWAY}${trimmed.slice("ipfs://ipfs/".length)}`;
  if (trimmed.startsWith("ipfs://")) return `${IPFS_GATEWAY}${trimmed.slice("ipfs://".length)}`;
  if (trimmed.startsWith("ar://")) return `https://arweave.net/${trimmed.slice("ar://".length)}`;
  return trimmed;
}

export function nftImageUrl(nft: NftImageFields) {
  return normalizeNftImageUrl(
    nft.image?.thumbnailUrl ||
      nft.image?.cachedUrl ||
      nft.image?.pngUrl ||
      nft.image?.originalUrl ||
      nft.media?.[0]?.thumbnail ||
      nft.media?.[0]?.gateway ||
      nft.media?.[0]?.raw ||
      nft.raw?.metadata?.image_url ||
      nft.raw?.metadata?.imageUrl ||
      nft.raw?.metadata?.image ||
      "",
  );
}
