import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

export async function GET() {
  const db = getDb();

  if (!db) {
    const { DIGITAL_DEALS } = await import("@/lib/data");
    return NextResponse.json({ data: DIGITAL_DEALS, total: DIGITAL_DEALS.length });
  }

  const rows = await db`SELECT * FROM listings WHERE marketplace = 'mini_app' LIMIT 10`;
  const data = rows.map((r: Record<string, unknown>) => ({
    id: r.id, name: r.title, type: "Mini App", price: Number(r.price),
    mrr: 0, chain: "Base", verified: r.status === "funded", includes: [],
  }));

  if (data.length === 0) {
    const { DIGITAL_DEALS } = await import("@/lib/data");
    return NextResponse.json({ data: DIGITAL_DEALS, total: DIGITAL_DEALS.length });
  }

  return NextResponse.json({ data, total: data.length });
}
