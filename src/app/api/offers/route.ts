import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

const offerSchema = z.object({
  listingId: z.string().min(1),
  offererAddress: z.string().startsWith("0x").length(42),
  amount: z.number().positive(),
  apr: z.number().min(0).max(100).optional(),
  termDays: z.number().int().positive().optional(),
  expiresInHours: z.number().int().positive().optional().default(24),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid offer", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const id = `O-${Date.now()}`;

  if (db) {
    await db`INSERT INTO offers (id, listing_id, offerer_address, amount, apr, term_days, status) VALUES (${id}, ${parsed.data.listingId}, ${parsed.data.offererAddress}, ${parsed.data.amount}, ${parsed.data.apr || null}, ${parsed.data.termDays || null}, 'pending')`;
  }

  return NextResponse.json({ data: { id, ...parsed.data, status: "pending", createdAt: new Date().toISOString() } }, { status: 201 });
}
