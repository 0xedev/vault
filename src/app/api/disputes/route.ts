import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase, shortAddress } from "@/lib/api";

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
    return badRequest("Invalid dispute", parsed.error.flatten());
  }

  const db = getDatabase();
  if (!db) return databaseRequired();
  const id = `D-${Date.now()}`;

  await db`INSERT INTO disputes (id, escrow_id, filer_address, against_address, reason, status, priority) VALUES (${id}, ${parsed.data.escrowId}, ${parsed.data.filerAddress}, ${parsed.data.againstAddress}, ${parsed.data.reason}, 'open', 'medium')`;

  return NextResponse.json({ data: { id, ...parsed.data, status: "open", createdAt: new Date().toISOString() } }, { status: 201 });
}

export async function GET() {
  const db = getDatabase();
  if (!db) return databaseRequired();

  const rows = await db`
    SELECT d.*, e.amount, e.currency, l.marketplace, l.title
    FROM disputes d
    LEFT JOIN escrows e ON e.id = d.escrow_id
    LEFT JOIN listings l ON l.id = e.listing_id
    ORDER BY d.created_at DESC
  ` as Record<string, unknown>[];

  const data = rows.map((row) => ({
    id: row.id,
    filed: row.created_at,
    filer: shortAddress(row.filer_address),
    against: shortAddress(row.against_address),
    market: String(row.marketplace || "Escrow").replace(/_/g, " "),
    asset: row.title || row.escrow_id || "Unlisted asset",
    frozen: Number(row.amount || 0),
    currency: row.currency || "ETH",
    reason: row.reason,
    status: row.status === "open" ? "new" : row.status,
    priority: row.priority,
  }));

  return NextResponse.json({ data, total: data.length });
}
