import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, shortAddress } from "@/lib/api";
import { mapMarket, writeAudit } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

const patchSchema = z.object({
  id: z.string().min(1),
  moderationStatus: z.enum(["pending", "approved", "rejected"]),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const rows = await db`SELECT * FROM listings ORDER BY created_at DESC` as Record<string, unknown>[];
  const data = rows.map((row) => ({
    id: row.id,
    market: mapMarket(row.marketplace),
    title: row.title,
    seller: shortAddress(row.seller_address),
    sellerAddress: row.seller_address,
    price: `${Number(row.price || 0)} ${row.currency || "ETH"}`,
    flagged: Number(row.flagged_count || 0),
    risk: Number(row.risk_score || 0),
    filed: row.created_at,
    status: row.moderation_status || "approved",
    listingStatus: row.status,
  }));

  return NextResponse.json({ data, total: data.length });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid listing moderation update", parsed.error.flatten());

  const { id, moderationStatus } = parsed.data;
  const listingStatus = moderationStatus === "rejected" ? "cancelled" : "active";
  await db`UPDATE listings SET moderation_status = ${moderationStatus}, status = ${listingStatus}, updated_at = NOW() WHERE id = ${id}`;
  await writeAudit(`LISTING_${moderationStatus.toUpperCase()}`, id, `Moderation status changed to ${moderationStatus}`, "admin", auth.user.address);

  return NextResponse.json({ data: { id, moderationStatus } });
}
