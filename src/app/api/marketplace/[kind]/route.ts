import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const db = getDb();

  if (!db) {
    const { LOANS, MINI_APPS, X_ACCOUNTS, FARCASTER } = await import("@/lib/data");
    const mockMap: Record<string, unknown[]> = {
      "nft-loans": LOANS, "mini-apps": MINI_APPS, "x-accounts": X_ACCOUNTS, farcaster: FARCASTER,
    };
    const mock = mockMap[kind];
    if (!mock) return NextResponse.json({ error: "Unknown marketplace kind" }, { status: 404 });
    return NextResponse.json({ data: mock, total: mock.length });
  }

  const dbKindMap: Record<string, string> = {
    "nft-loans": "nft_loan", "mini-apps": "mini_app", "x-accounts": "x_account", farcaster: "farcaster",
  };
  const dbKind = dbKindMap[kind];
  if (!dbKind) return NextResponse.json({ error: "Unknown marketplace kind" }, { status: 404 });

  const rows = await db`SELECT * FROM listings WHERE marketplace = ${dbKind} ORDER BY created_at DESC`;

  if (rows.length === 0) {
    const { LOANS, MINI_APPS, X_ACCOUNTS, FARCASTER } = await import("@/lib/data");
    const mockMap: Record<string, unknown[]> = {
      "nft-loans": LOANS, "mini-apps": MINI_APPS, "x-accounts": X_ACCOUNTS, farcaster: FARCASTER,
    };
    return NextResponse.json({ data: mockMap[kind] || [], total: (mockMap[kind] || []).length });
  }

  const data = rows.map((r: Record<string, unknown>) => {
    const cd = typeof r.collateral_data === "string" ? JSON.parse(r.collateral_data as string) : (r.collateral_data || {});
    return { id: r.id, coll: cd.coll || 0, token: cd.token || "", amt: Number(r.price), apr: cd.apr || 0, term: cd.term || 0, ltv: cd.ltv || 0, status: cd.status || "open", bid: 0, value: cd.value || 0, borrower: String(r.seller_address || "").slice(0, 6) + "..." + String(r.seller_address || "").slice(-4) };
  });

  return NextResponse.json({ data, total: data.length });
}
