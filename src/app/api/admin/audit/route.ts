import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const rows = await db`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100` as Record<string, unknown>[];
  const data = rows.map((row) => ({
    id: row.id,
    t: row.created_at,
    who: row.actor,
    actorAddress: row.actor_address,
    action: row.action,
    target: row.target,
    note: row.note || "",
    txHash: row.tx_hash,
  }));

  return NextResponse.json({ data, total: data.length });
}
