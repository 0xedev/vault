import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchIndexedUserProfile } from "@/lib/subgraph";

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
  const normalizedAddress = address.toLowerCase();

  const indexed = await fetchIndexedUserProfile(normalizedAddress).catch(() => null);
  const rows = await db`SELECT * FROM users WHERE address = ${normalizedAddress}` as Record<string, unknown>[];
  if (rows.length === 0) {
    return NextResponse.json({
      data: {
        address: normalizedAddress,
        trades: indexed?.indexedTrades || 0,
        reputation: 0,
        lockedBalance: indexed?.indexedLockedBalance || 0,
        role: "user",
        indexed,
      },
    });
  }

  const u = rows[0];
  return NextResponse.json({
    data: {
      address: u.address,
      trades: Math.max(Number(u.trades || 0), indexed?.indexedTrades || 0),
      reputation: u.reputation,
      lockedBalance: Math.max(Number(u.locked_balance || 0), indexed?.indexedLockedBalance || 0),
      role: u.role,
      indexed,
    },
  });
}
