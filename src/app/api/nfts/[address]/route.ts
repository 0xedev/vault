import { NextRequest, NextResponse } from "next/server";
import { AlchemyConfigError, getNFTsForOwner } from "@/lib/alchemy";
import { ERC721_ABI, getNftAddress, getPublicClient } from "@/lib/contract";
import type { Address } from "viem";

async function markTransferableNfts(address: string, nfts: Awaited<ReturnType<typeof getNFTsForOwner>>) {
  try {
    const client = getPublicClient();
    const spender = await getNftAddress();
    const owner = address as Address;

    return Promise.all(
      nfts.map(async (nft) => {
        try {
          const tokenId = BigInt(nft.tokenId);
          await client.simulateContract({
            address: nft.contract.address as Address,
            abi: ERC721_ABI,
            functionName: "approve",
            args: [spender, tokenId],
            account: owner,
          });
          await client.simulateContract({
            address: nft.contract.address as Address,
            abi: ERC721_ABI,
            functionName: "safeTransferFrom",
            args: [owner, spender, tokenId],
            account: owner,
          });
          return { ...nft, transferable: true };
        } catch {
          return { ...nft, transferable: false };
        }
      }),
    );
  } catch {
    return nfts;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const { searchParams } = new URL(_req.url);
  const chain = (searchParams.get("chain") || "base") as "base" | "eth";

  try {
    const nfts = await getNFTsForOwner(address, chain);
    const data = chain === "base" ? await markTransferableNfts(address, nfts) : nfts;
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch NFTs";
    const code = err instanceof AlchemyConfigError ? "alchemy_config" : "alchemy_upstream";
    return NextResponse.json({ data: [], error: message, code });
  }
}
