import { NextRequest, NextResponse } from "next/server";
import { relativeDeadline, shortAddress, stageLabel } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireUser(_req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const rows = auth.user.role === "admin"
    ? await db`SELECT e.*, l.marketplace, l.title FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id WHERE e.id = ${id}` as Record<string, unknown>[]
    : await db`SELECT e.*, l.marketplace, l.title FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id WHERE e.id = ${id} AND (e.buyer_address = ${auth.user.address} OR e.seller_address = ${auth.user.address})` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const r = rows[0];
  return NextResponse.json({
    data: {
      id: r.id,
      kind: String(r.marketplace || "Escrow").replace(/_/g, " "),
      party: shortAddress(r.buyer_address),
      asset: r.title || r.listing_id || "Unlisted asset",
      amount: Number(r.amount),
      asset_type: r.currency || "ETH",
      deadline: relativeDeadline(r.deadline),
      stage: stageLabel(r.stage),
      action: "On schedule",
    },
  });
}
