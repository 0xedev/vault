import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const [escrowRows, disputeRows, ticketRows] = await Promise.all([
    db`SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS locked FROM escrows WHERE stage NOT IN ('released', 'refunded')` as Promise<Record<string, unknown>[]>,
    db`SELECT COUNT(*) AS count FROM disputes WHERE status <> 'resolved'` as Promise<Record<string, unknown>[]>,
    db`SELECT COUNT(*) AS count FROM support_tickets WHERE status <> 'resolved'` as Promise<Record<string, unknown>[]>,
  ]);

  const locked = Number(escrowRows[0]?.locked || 0);
  return NextResponse.json({
    data: {
      activeEscrows: Number(escrowRows[0]?.count || 0),
      totalLocked: locked,
      estimatedFees: locked * 0.015,
      activeDisputes: Number(disputeRows[0]?.count || 0),
      openTickets: Number(ticketRows[0]?.count || 0),
    },
  });
}
