import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase } from "@/lib/api";
import { mapFarcasterListing, mapLoanListing, mapMiniAppListing, mapXAccountListing } from "@/lib/marketplace";

const dbKindMap: Record<string, string> = {
  "nft-loans": "nft_loan",
  "mini-apps": "mini_app",
  "x-accounts": "x_account",
  farcaster: "farcaster",
};

const marketplaceListingSchema = z.object({
  sellerAddress: z.string().startsWith("0x").length(42),
  title: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const db = getDatabase();
  if (!db) return databaseRequired();

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const dbKind = dbKindMap[kind];
  if (!dbKind || kind === "nft-loans") return NextResponse.json({ error: "Unknown marketplace kind" }, { status: 404 });

  const parsed = marketplaceListingSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid marketplace listing", parsed.error.flatten());

  const db = getDatabase();
  if (!db) return databaseRequired();

  const idPrefix = kind === "mini-apps" ? "M" : kind === "x-accounts" ? "X" : "F";
  const id = `${idPrefix}-${Date.now()}`;
  const data = JSON.stringify(parsed.data.data);

  await db`INSERT INTO users (address) VALUES (${parsed.data.sellerAddress}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO listings (id, seller_address, marketplace, title, description, price, collateral_data, status, moderation_status)
    VALUES (${id}, ${parsed.data.sellerAddress}, ${dbKind}, ${parsed.data.title}, ${parsed.data.description || null}, ${parsed.data.price}, ${data}, 'active', 'pending')`;

  return NextResponse.json({ data: { id, status: "pending" } }, { status: 201 });
}
