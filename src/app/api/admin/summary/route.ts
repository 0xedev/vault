import { NextResponse } from "next/server";
import { databaseRequired, getDatabase } from "@/lib/api";

export async function GET() {
  const db = getDatabase();
  if (!db) return databaseRequired();

  const [escrowRows, disputeRows, listingRows, ticketRows, verificationRows] = await Promise.all([
    db`SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS locked FROM escrows WHERE stage NOT IN ('released', 'refunded')` as Promise<Record<string, unknown>[]>,
    db`SELECT COUNT(*) AS count FROM disputes WHERE status <> 'resolved'` as Promise<Record<string, unknown>[]>,
    db`SELECT COUNT(*) AS count FROM listings WHERE moderation_status = 'pending'` as Promise<Record<string, unknown>[]>,
    db`SELECT COUNT(*) AS count FROM support_tickets WHERE status <> 'resolved'` as Promise<Record<string, unknown>[]>,
    db`SELECT COUNT(*) AS count FROM verifications WHERE status = 'pending'` as Promise<Record<string, unknown>[]>,
  ]);

  const locked = Number(escrowRows[0]?.locked || 0);
  return NextResponse.json({
    data: {
      activeEscrows: Number(escrowRows[0]?.count || 0),
      totalLocked: locked,
      estimatedFees: locked * 0.015,
      activeDisputes: Number(disputeRows[0]?.count || 0),
      pendingListings: Number(listingRows[0]?.count || 0),
      openTickets: Number(ticketRows[0]?.count || 0),
      pendingVerifications: Number(verificationRows[0]?.count || 0),
    },
  });
}
