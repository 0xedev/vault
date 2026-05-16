import { NextResponse } from "next/server";
import { databaseRequired, getDatabase } from "@/lib/api";

export async function GET() {
  const db = getDatabase();
  if (!db) return databaseRequired();

  const rows = await db`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100` as Record<string, unknown>[];
  const data = rows.map((row) => ({
    id: row.id,
    t: row.created_at,
    who: row.actor,
    action: row.action,
    target: row.target,
    note: row.note || "",
  }));

  return NextResponse.json({ data, total: data.length });
}
