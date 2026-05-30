import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase } from "@/lib/api";
import { mapClankerListing, mapFarcasterListing, mapLoanListing, mapMiniAppListing, mapXAccountListing, mapBundleListing } from "@/lib/marketplace";
import { requireUser } from "@/lib/auth";

const dbKindMap: Record<string, string> = {
  "nft-loans": "nft_loan",
  "mini-apps": "mini_app",
  "x-accounts": "x_account",
  farcaster: "farcaster",
  clanker: "clanker",
  bundles: "bundle",
};

const marketplaceListingSchema = z.object({
  sellerAddress: z.string().startsWith("0x").length(42).optional(),
  title: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  data: z.record(z.string(), z.unknown()).default({}),
  chainId: z.number().int().positive().optional(),
  contractAddress: z.string().startsWith("0x").optional(),
  contractListingId: z.string().optional(),
  txHash: z.string().startsWith("0x").optional(),
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

  let rows: Record<string, unknown>[];

  if (dbKind === "bundle") {
    rows = await db`
      SELECT
        l.*,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', la.id,
              'assetType', la.asset_type,
              'assetData', la.asset_data,
              'position', la.position
            ) ORDER BY la.position
          ) FILTER (WHERE la.id IS NOT NULL),
          '[]'::jsonb
        ) AS listing_assets_data
      FROM listings l
      LEFT JOIN listing_assets la ON la.listing_id = l.id
      WHERE l.marketplace = 'bundle'
        AND l.moderation_status = 'approved'
        AND l.status <> 'cancelled'
      GROUP BY l.id
      ORDER BY l.created_at DESC
    ` as Record<string, unknown>[];
  } else {
    rows = await db`SELECT * FROM listings WHERE marketplace = ${dbKind} AND moderation_status = 'approved' AND status <> 'cancelled' ORDER BY created_at DESC` as Record<string, unknown>[];
  }

  const data =
    kind === "nft-loans" ? rows.map(mapLoanListing) :
    kind === "mini-apps" ? rows.map(mapMiniAppListing) :
    kind === "x-accounts" ? rows.map(mapXAccountListing) :
    kind === "clanker" ? rows.map(mapClankerListing) :
    kind === "bundles" ? rows.map(mapBundleListing) :
    rows.map(mapFarcasterListing);

  return NextResponse.json({ data, total: data.length });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const { kind } = await params;
  const dbKind = dbKindMap[kind];
  if (!dbKind || kind === "nft-loans") return NextResponse.json({ error: kind === "nft-loans" ? "Use /api/listings for NFT loans" : "Unknown marketplace kind" }, { status: 404 });

  const parsed = marketplaceListingSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid marketplace listing", parsed.error.flatten());

  const db = auth.db;

  const idPrefix = kind === "mini-apps" ? "M" : kind === "x-accounts" ? "X" : kind === "clanker" ? "C" : "F";
  const id = `${idPrefix}-${Date.now()}`;
  const data = JSON.stringify(parsed.data.data);

  await db`INSERT INTO users (address) VALUES (${auth.user.address}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO listings (id, seller_address, marketplace, title, description, price, collateral_data, status, moderation_status, chain_id, contract_address, contract_listing_id, tx_hash, tx_status)
    VALUES (${id}, ${auth.user.address}, ${dbKind}, ${parsed.data.title}, ${parsed.data.description || null}, ${parsed.data.price}, ${data}, 'active', 'pending', ${parsed.data.chainId || null}, ${parsed.data.contractAddress || null}, ${parsed.data.contractListingId || null}, ${parsed.data.txHash || null}, ${parsed.data.txHash ? "pending" : "offchain"})`;
  await db`INSERT INTO verifications (id, listing_id, marketplace, target, owner_address, method, status, checks)
    VALUES (${`V-${Date.now()}`}, ${id}, ${dbKind}, ${parsed.data.title}, ${auth.user.address}, ${kind === "mini-apps" ? "dns" : kind === "x-accounts" ? "x_tweet" : "farcaster_registry"}, 'pending', ${JSON.stringify([])})`;

  return NextResponse.json({ data: { id, status: "pending" } }, { status: 201 });
}
