import { NextRequest, NextResponse } from "next/server";
import { databaseRequired, getDatabase } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const db = getDatabase();

  if (!db) return databaseRequired();

  const rows = await db`SELECT * FROM users WHERE address = ${address}` as Record<string, unknown>[];
  if (rows.length === 0) {
    return NextResponse.json({ data: { address, trades: 0, reputation: 0, lockedBalance: 0, role: "user" } });
  }

  const u = rows[0];
  return NextResponse.json({
    data: { address: u.address, trades: u.trades, reputation: u.reputation, lockedBalance: u.locked_balance, role: u.role },
  });
}
