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
    const { LOANS, COLLECTIONS } = await import("@/lib/data");
    const loan = LOANS.find((l) => l.id === id);
    if (!loan) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    return NextResponse.json({ data: { ...loan, collection: COLLECTIONS[loan.coll] } });
  }

  const rows = await db`SELECT * FROM listings WHERE id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const r = rows[0];
  const cd = typeof r.collateral_data === "string" ? JSON.parse(r.collateral_data as string) : (r.collateral_data || {});
  return NextResponse.json({
    data: {
      id: r.id, coll: cd.coll || 0, token: cd.token || "", amt: Number(r.price),
      apr: cd.apr || 0, term: cd.term || 0, ltv: cd.ltv || 0,
      status: cd.status || r.status, bid: cd.bid || 0, value: cd.value || 0,
      borrower: String(r.seller_address).slice(0, 6) + "..." + String(r.seller_address).slice(-4),
      collection: "",
    },
  });
}
