import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

const disputeSchema = z.object({
  escrowId: z.string().min(1),
  filerAddress: z.string().startsWith("0x").length(42),
  againstAddress: z.string().startsWith("0x").length(42),
  reason: z.string().min(10).max(500),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid dispute", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const id = `D-${Date.now()}`;

  if (db) {
    await db`INSERT INTO disputes (id, escrow_id, filer_address, against_address, reason, status, priority) VALUES (${id}, ${parsed.data.escrowId}, ${parsed.data.filerAddress}, ${parsed.data.againstAddress}, ${parsed.data.reason}, 'open', 'medium')`;
  }

  return NextResponse.json({ data: { id, ...parsed.data, status: "open", createdAt: new Date().toISOString() } }, { status: 201 });
}
