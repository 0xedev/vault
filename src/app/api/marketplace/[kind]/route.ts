import { NextRequest, NextResponse } from "next/server";
import { databaseRequired, getDatabase } from "@/lib/api";
import { mapFarcasterListing, mapLoanListing, mapMiniAppListing, mapXAccountListing } from "@/lib/marketplace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const db = getDatabase();
  if (!db) return databaseRequired();

  const dbKindMap: Record<string, string> = {
    "nft-loans": "nft_loan", "mini-apps": "mini_app", "x-accounts": "x_account", farcaster: "farcaster",
  };
  const dbKind = dbKindMap[kind];
  if (!dbKind) return NextResponse.json({ error: "Unknown marketplace kind" }, { status: 404 });

  const rows = await db`SELECT * FROM listings WHERE marketplace = ${dbKind} AND moderation_status = 'approved' AND status <> 'cancelled' ORDER BY created_at DESC` as Record<string, unknown>[];
  const data =
    kind === "nft-loans" ? rows.map(mapLoanListing) :
    kind === "mini-apps" ? rows.map(mapMiniAppListing) :
    kind === "x-accounts" ? rows.map(mapXAccountListing) :
    rows.map(mapFarcasterListing);

  return NextResponse.json({ data, total: data.length });
}
