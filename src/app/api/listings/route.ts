import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase } from "@/lib/api";
import { mapLoanListing } from "@/lib/marketplace";
import { requireUser } from "@/lib/auth";

const listingSchema = z.object({
  id: z.string().min(1).optional(),
  seller: z.string().startsWith("0x").min(10).optional(),
  amount: z.number().positive(),
  apr: z.number().min(0).max(100),
  term: z.number().int().positive().max(365),
  collection: z.string().min(1),
  tokenId: z.string().min(1),
  ltv: z.number().min(0).max(100),
  value: z.number().nonnegative().optional(),
  chainId: z.number().int().positive().optional(),
  contractAddress: z.string().startsWith("0x").optional(),
  contractListingId: z.string().optional(),
  txHash: z.string().startsWith("0x").optional(),
});

export async function GET(req: NextRequest) {
  const db = getDatabase();
  if (!db) return databaseRequired();

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "all";
  const sort = url.searchParams.get("sort") || "apr";
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  let rows: Record<string, unknown>[];
  let countRows: Record<string, unknown>[];

  if (status === "all") {
    rows = await db`SELECT * FROM listings WHERE marketplace = 'nft_loan' AND moderation_status = 'approved' AND status <> 'cancelled' LIMIT ${limit} OFFSET ${offset}` as Record<string, unknown>[];
    countRows = await db`SELECT COUNT(*) as count FROM listings WHERE marketplace = 'nft_loan' AND moderation_status = 'approved' AND status <> 'cancelled'` as Record<string, unknown>[];
  } else {
    rows = await db`SELECT * FROM listings WHERE marketplace = 'nft_loan' AND moderation_status = 'approved' AND status <> 'cancelled' AND collateral_data->>'status' = ${status} LIMIT ${limit} OFFSET ${offset}` as Record<string, unknown>[];
    countRows = await db`SELECT COUNT(*) as count FROM listings WHERE marketplace = 'nft_loan' AND moderation_status = 'approved' AND status <> 'cancelled' AND collateral_data->>'status' = ${status}` as Record<string, unknown>[];
  }

  const total = parseInt(countRows[0]?.count as string || "0");

  const data = rows.map(mapLoanListing);

  if (sort === "apr") data.sort((a, b) => b.apr - a.apr);
  if (sort === "amt") data.sort((a, b) => b.amt - a.amt);
  if (sort === "ltv") data.sort((a, b) => a.ltv - b.ltv);

  return NextResponse.json({ data, total, offset, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid listing", parsed.error.flatten());

  const db = auth.db;

  const data = parsed.data;
  const id = data.id || `L-${Date.now()}`;
  const collateralData = JSON.stringify({
    collection: data.collection,
    token: data.tokenId,
    apr: data.apr,
    term: data.term,
    ltv: data.ltv,
    status: "open",
    value: data.value || 0,
  });

  await db`INSERT INTO users (address) VALUES (${auth.user.address}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO listings (id, seller_address, marketplace, title, price, collateral_data, status, moderation_status, chain_id, contract_address, contract_listing_id, tx_hash, tx_status)
    VALUES (${id}, ${auth.user.address}, 'nft_loan', ${`${data.collection} ${data.tokenId}`}, ${data.amount}, ${collateralData}, 'active', 'pending', ${data.chainId || null}, ${data.contractAddress || null}, ${data.contractListingId || null}, ${data.txHash || null}, ${data.txHash ? "pending" : "offchain"})`;

  return NextResponse.json({ data: { id, ...data, status: "open" } }, { status: 201 });
}
