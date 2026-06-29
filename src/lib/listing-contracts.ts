import { getEscrowAddress, getNftAddress } from "@/lib/contract";

export function normalizeContractAddress(address: unknown) {
  return typeof address === "string" ? address.toLowerCase() : "";
}

export async function activeListingContractAddress(marketplace: string) {
  return normalizeContractAddress(
    marketplace === "nft_loan" ? await getNftAddress() : getEscrowAddress(),
  );
}
