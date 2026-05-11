import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  if (!db) {
    const { ESCROWS } = await import("@/lib/data");
    const escrow = ESCROWS.find((e) => e.id === id);
    if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    return NextResponse.json({ data: escrow });
  }

  const rows = await db`SELECT * FROM escrows WHERE id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const r = rows[0];
  return NextResponse.json({
    data: {
      id: r.id, kind: "NFT Loan",
      party: String(r.buyer_address).slice(0, 6) + "\u2026" + String(r.buyer_address).slice(-4),
      asset: r.listing_id || "—", amount: Number(r.amount),
      asset_type: r.currency || "ETH", deadline: r.deadline ? "in 30d" : "—",
      stage: String(r.stage), action: "On schedule",
    },
  });
}
