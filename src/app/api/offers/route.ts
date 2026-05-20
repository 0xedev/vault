import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase, shortAddress } from "@/lib/api";
import { forbidden, requireUser } from "@/lib/auth";

const offerSchema = z.object({
  listingId: z.string().min(1),
  offererAddress: z.string().startsWith("0x").length(42).optional(),
  amount: z.number().positive(),
  apr: z.number().min(0).max(100).optional(),
  termDays: z.number().int().positive().optional(),
  expiresInHours: z.number().int().positive().optional().default(24),
  chainId: z.number().int().positive().optional(),
  txHash: z.string().startsWith("0x").optional(),
});

const offerStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["accepted", "rejected"]),
});

export async function GET(req: NextRequest) {
  const db = getDatabase();
  if (!db) return databaseRequired();

  const listingId = new URL(req.url).searchParams.get("listingId");
  if (!listingId) return badRequest("listingId is required");

  const rows = await db`SELECT * FROM offers WHERE listing_id = ${listingId} ORDER BY created_at DESC` as Record<string, unknown>[];
  const data = rows.map((row: Record<string, unknown>) => ({
    id: row.id,
    who: shortAddress(row.offerer_address),
    offererAddress: row.offerer_address,
    amt: Number(row.amount),
    apr: Number(row.apr || 0),
    term: Number(row.term_days || 0),
    when: row.created_at,
    status: row.status,
  }));

  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid offer", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = auth.db;
  const id = `O-${Date.now()}`;

  await db`INSERT INTO users (address) VALUES (${auth.user.address}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO offers (id, listing_id, offerer_address, amount, apr, term_days, status, chain_id, tx_hash, tx_status)
    VALUES (${id}, ${parsed.data.listingId}, ${auth.user.address}, ${parsed.data.amount}, ${parsed.data.apr || null}, ${parsed.data.termDays || null}, 'pending', ${parsed.data.chainId || null}, ${parsed.data.txHash || null}, ${parsed.data.txHash ? "pending" : "offchain"})`;

  return NextResponse.json({ data: { id, ...parsed.data, offererAddress: auth.user.address, status: "pending", createdAt: new Date().toISOString() } }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = offerStatusSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid offer status", parsed.error.flatten());

  const db = auth.db;
  const rows = await db`
    SELECT o.id, o.listing_id, l.seller_address
    FROM offers o
    JOIN listings l ON l.id = o.listing_id
    WHERE o.id = ${parsed.data.id}
    LIMIT 1
  ` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (String(rows[0].seller_address).toLowerCase() !== auth.user.address && auth.user.role !== "admin") {
    return forbidden("Only the listing owner can update this offer.");
  }

  await db`UPDATE offers SET status = ${parsed.data.status} WHERE id = ${parsed.data.id}`;
  if (parsed.data.status === "accepted") {
    await db`UPDATE listings SET status = 'funded', updated_at = NOW() WHERE id = ${rows[0].listing_id}`;
  }
  return NextResponse.json({ data: parsed.data });
}
