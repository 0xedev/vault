import { NextRequest, NextResponse } from "next/server";
import { AlchemyConfigError, getFloorPrice, getNFTMetadata } from "@/lib/alchemy";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string; tokenId: string }> }
) {
  const { address, tokenId } = await params;
  const { searchParams } = new URL(_req.url);
  const chain = (searchParams.get("chain") || "base") as "base" | "eth";

  try {
    const [floorPrice, metadata] = await Promise.all([
      getFloorPrice(address, chain),
      getNFTMetadata(address, tokenId, chain),
    ]);
    return NextResponse.json({ data: { floorPrice, metadata } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch NFT data";
    const status = err instanceof AlchemyConfigError ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
