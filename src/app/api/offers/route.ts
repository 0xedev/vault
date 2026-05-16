import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase, shortAddress } from "@/lib/api";

const offerSchema = z.object({
  listingId: z.string().min(1),
  offererAddress: z.string().startsWith("0x").length(42),
  amount: z.number().positive(),
  apr: z.number().min(0).max(100).optional(),
  termDays: z.number().int().positive().optional(),
  expiresInHours: z.number().int().positive().optional().default(24),
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
  const body = await req.json();
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid offer", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDatabase();
  if (!db) return databaseRequired();
  const id = `O-${Date.now()}`;

  await db`INSERT INTO users (address) VALUES (${parsed.data.offererAddress}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO offers (id, listing_id, offerer_address, amount, apr, term_days, status) VALUES (${id}, ${parsed.data.listingId}, ${parsed.data.offererAddress}, ${parsed.data.amount}, ${parsed.data.apr || null}, ${parsed.data.termDays || null}, 'pending')`;

  return NextResponse.json({ data: { id, ...parsed.data, status: "pending", createdAt: new Date().toISOString() } }, { status: 201 });
}
