import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

export async function GET(req: NextRequest) {
  const db = getDb();
  if (!db) {
    const { LOANS } = await import("@/lib/data");
    return NextResponse.json({ data: LOANS, total: LOANS.length });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "all";
  const sort = url.searchParams.get("sort") || "apr";
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  let rows: Record<string, unknown>[];
  let countRows: Record<string, unknown>[];

  if (status === "all") {
    rows = await db`SELECT * FROM listings WHERE marketplace = 'nft_loan' LIMIT ${limit} OFFSET ${offset}`;
    countRows = await db`SELECT COUNT(*) as count FROM listings WHERE marketplace = 'nft_loan'`;
  } else {
    rows = await db`SELECT * FROM listings WHERE marketplace = 'nft_loan' AND collateral_data->>'status' = ${status} LIMIT ${limit} OFFSET ${offset}`;
    countRows = await db`SELECT COUNT(*) as count FROM listings WHERE marketplace = 'nft_loan' AND collateral_data->>'status' = ${status}`;
  }

  const total = parseInt(countRows[0]?.count as string || "0");

  const data = rows.map((r: Record<string, unknown>) => {
    const cd = typeof r.collateral_data === "string" ? JSON.parse(r.collateral_data as string) : (r.collateral_data || {});
    return {
      id: r.id, coll: cd.coll || 0, token: cd.token || "", amt: Number(r.price),
      apr: cd.apr || 0, term: cd.term || 0, ltv: cd.ltv || 0,
      status: cd.status || r.status, bid: cd.bid || 0, value: cd.value || 0,
      borrower: String(r.seller_address || "").slice(0, 6) + "..." + String(r.seller_address || "").slice(-4),
    };
  });

  if (sort === "apr") data.sort((a, b) => b.apr - a.apr);
  if (sort === "amt") data.sort((a, b) => b.amt - a.amt);
  if (sort === "ltv") data.sort((a, b) => a.ltv - b.ltv);

  return NextResponse.json({ data, total, offset, limit });
}
