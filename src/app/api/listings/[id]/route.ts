import { NextRequest, NextResponse } from "next/server";
import { databaseRequired, getDatabase } from "@/lib/api";
import { mapLoanListing } from "@/lib/marketplace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDatabase();
  if (!db) return databaseRequired();

  const rows = await db`SELECT * FROM listings WHERE id = ${id} AND moderation_status = 'approved' AND status <> 'cancelled'` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  return NextResponse.json({ data: mapLoanListing(rows[0]) });
}
