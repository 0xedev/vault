import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, shortAddress } from "@/lib/api";
import { actorAddressForRequest, requireUser } from "@/lib/auth";

const disputeSchema = z.object({
  escrowId: z.string().min(1),
  filerAddress: z.string().startsWith("0x").length(42).optional(),
  againstAddress: z.string().startsWith("0x").length(42).optional(),
  reason: z.string().min(10).max(500),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid dispute", parsed.error.flatten());
  }
  const actorAddress = actorAddressForRequest(auth.user, parsed.data.filerAddress);

  const db = auth.db;
  const escrowRows = await db`SELECT * FROM escrows WHERE id = ${parsed.data.escrowId} AND (buyer_address = ${actorAddress} OR seller_address = ${actorAddress}) LIMIT 1` as Record<string, unknown>[];
  if (escrowRows.length === 0) return NextResponse.json({ error: "Escrow not found for this session" }, { status: 404 });
  const escrow = escrowRows[0];
  const againstAddress = String(escrow.buyer_address).toLowerCase() === actorAddress
    ? String(escrow.seller_address)
    : String(escrow.buyer_address);
  const id = `D-${Date.now()}`;

  await db`INSERT INTO disputes (id, escrow_id, filer_address, against_address, reason, status, priority) VALUES (${id}, ${parsed.data.escrowId}, ${actorAddress}, ${againstAddress}, ${parsed.data.reason}, 'open', 'medium')`;
  await db`UPDATE escrows SET stage = 'disputed', updated_at = NOW() WHERE id = ${parsed.data.escrowId}`;

  return NextResponse.json({ data: { id, ...parsed.data, filerAddress: actorAddress, againstAddress, status: "open", createdAt: new Date().toISOString() } }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;
  const url = new URL(req.url);
  const actorAddress = actorAddressForRequest(auth.user, url.searchParams.get("walletAddress"));

  const rows = auth.user.role === "admin" ? await db`
    SELECT d.*, e.amount, e.currency, l.marketplace, l.title
    FROM disputes d
    LEFT JOIN escrows e ON e.id = d.escrow_id
    LEFT JOIN listings l ON l.id = e.listing_id
    ORDER BY d.created_at DESC
  ` as Record<string, unknown>[] : await db`
    SELECT d.*, e.amount, e.currency, l.marketplace, l.title
    FROM disputes d
    LEFT JOIN escrows e ON e.id = d.escrow_id
    LEFT JOIN listings l ON l.id = e.listing_id
    WHERE d.filer_address = ${actorAddress} OR d.against_address = ${actorAddress}
    ORDER BY d.created_at DESC
  ` as Record<string, unknown>[];

  const data = rows.map((row) => ({
    id: row.id,
    filed: row.created_at,
    filer: shortAddress(row.filer_address),
    against: shortAddress(row.against_address),
    market: String(row.marketplace || "Escrow").replace(/_/g, " "),
    asset: row.title || row.escrow_id || "Unlisted asset",
    frozen: Number(row.amount || 0),
    currency: row.currency || "USDC",
    reason: row.reason,
    status: row.status === "open" ? "new" : row.status,
    priority: row.priority,
  }));

  return NextResponse.json({ data, total: data.length });
}
