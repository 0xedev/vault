import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const auth = await requireUser(_req);
  if ("response" in auth) return auth.response;
  if (auth.user.role !== "admin" && auth.user.address !== address.toLowerCase()) {
    return NextResponse.json({ error: "Profile access denied" }, { status: 403 });
  }
  const db = auth.db;

  const rows = await db`SELECT * FROM users WHERE address = ${address}` as Record<string, unknown>[];
  if (rows.length === 0) {
    return NextResponse.json({ data: { address, trades: 0, reputation: 0, lockedBalance: 0, role: "user" } });
  }

  const u = rows[0];
  return NextResponse.json({
    data: { address: u.address, trades: u.trades, reputation: u.reputation, lockedBalance: u.locked_balance, role: u.role },
  });
}
