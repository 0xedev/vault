import { NextResponse } from "next/server";
import { databaseRequired, getDatabase } from "@/lib/api";
import { mapDigitalDeal } from "@/lib/marketplace";

export async function GET() {
  const db = getDatabase();
  if (!db) return databaseRequired();

  const rows = await db`SELECT * FROM listings WHERE marketplace IN ('mini_app', 'x_account', 'farcaster', 'otc') AND moderation_status = 'approved' AND status <> 'cancelled' ORDER BY created_at DESC LIMIT 20` as Record<string, unknown>[];
  const data = rows.map(mapDigitalDeal);

  return NextResponse.json({ data, total: data.length });
}
