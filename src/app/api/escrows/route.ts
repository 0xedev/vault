import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

export async function GET() {
  const db = getDb();

  if (!db) {
    const { ESCROWS } = await import("@/lib/data");
    return NextResponse.json({ data: ESCROWS, total: ESCROWS.length });
  }

  const rows = await db`SELECT * FROM escrows ORDER BY created_at DESC`;
  const data = rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    kind: "NFT Loan",
    party: String(r.buyer_address).slice(0, 6) + "\u2026" + String(r.buyer_address).slice(-4),
    asset: r.listing_id || "—",
    amount: Number(r.amount),
    asset_type: r.currency || "ETH",
    deadline: r.deadline ? "in 30d" : "—",
    stage: String(r.stage).replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    action: String(r.stage) === "funds_locked" ? "Awaiting seller" : String(r.stage) === "awaiting_confirmation" ? "Awaiting confirmation" : "On schedule",
  }));

  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  if (!db) return NextResponse.json({ data: { id: `E-${Date.now()}` } }, { status: 201 });

  const body = await req.json();
  const id = `E-${Date.now()}`;
  await db`INSERT INTO escrows (id, buyer_address, seller_address, amount) VALUES (${id}, ${body.buyerAddress}, ${body.sellerAddress}, ${body.amount})`;

  return NextResponse.json({ data: { id } }, { status: 201 });
}
