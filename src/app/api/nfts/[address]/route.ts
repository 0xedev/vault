import { NextRequest, NextResponse } from "next/server";
import { getNFTsForOwner } from "@/lib/alchemy";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const { searchParams } = new URL(_req.url);
  const chain = (searchParams.get("chain") || "base") as "base" | "eth";

  try {
    const nfts = await getNFTsForOwner(address, chain);
    return NextResponse.json({ data: nfts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch NFTs";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
