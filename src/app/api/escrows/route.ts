import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase, relativeDeadline, shortAddress, stageLabel } from "@/lib/api";

const escrowSchema = z.object({
  listingId: z.string().min(1).optional(),
  buyerAddress: z.string().startsWith("0x").min(10),
  sellerAddress: z.string().startsWith("0x").min(10),
  amount: z.number().positive(),
  currency: z.string().min(1).default("ETH"),
});

export async function GET() {
  const db = getDatabase();
  if (!db) return databaseRequired();

  const rows = await db`SELECT e.*, l.marketplace, l.title FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id ORDER BY e.created_at DESC` as Record<string, unknown>[];
  const data = rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    kind: String(r.marketplace || "Escrow").replace(/_/g, " "),
    party: shortAddress(r.buyer_address),
    asset: r.title || r.listing_id || "Unlisted asset",
    amount: Number(r.amount),
    asset_type: r.currency || "ETH",
    deadline: relativeDeadline(r.deadline),
    stage: stageLabel(r.stage),
    action: String(r.stage) === "funds_locked" ? "Awaiting seller" : String(r.stage) === "awaiting_confirmation" ? "Awaiting confirmation" : "On schedule",
  }));

  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: NextRequest) {
  const db = getDatabase();
  if (!db) return databaseRequired();
  const body = await req.json();
  const parsed = escrowSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid escrow", parsed.error.flatten());

  const data = parsed.data;
  const id = `E-${Date.now()}`;
  await db`INSERT INTO users (address) VALUES (${data.buyerAddress}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO users (address) VALUES (${data.sellerAddress}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO escrows (id, listing_id, buyer_address, seller_address, amount, currency, stage)
    VALUES (${id}, ${data.listingId || null}, ${data.buyerAddress}, ${data.sellerAddress}, ${data.amount}, ${data.currency}, 'funds_locked')`;
  await db`INSERT INTO transactions (id, escrow_id, from_address, to_address, amount, currency, tx_type)
    VALUES (${`T-${Date.now()}`}, ${id}, ${data.buyerAddress}, ${data.sellerAddress}, ${data.amount}, ${data.currency}, 'escrow_funded')`;

  return NextResponse.json({ data: { id } }, { status: 201 });
}
