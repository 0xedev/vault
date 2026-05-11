import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const db = getDb();

  if (!db) {
    return NextResponse.json({ data: { address, joinedAt: "2024-01-01", trades: 42, reputation: 4.8, lockedBalance: 0, role: "user" } });
  }

  const rows = await db`SELECT * FROM users WHERE address = ${address}`;
  if (rows.length === 0) {
    return NextResponse.json({ data: { address, trades: 0, reputation: 0, lockedBalance: 0, role: "user" } });
  }

  const u = rows[0];
  return NextResponse.json({
    data: { address: u.address, trades: u.trades, reputation: u.reputation, lockedBalance: u.locked_balance, role: u.role },
  });
}
