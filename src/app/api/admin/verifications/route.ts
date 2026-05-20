import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, jsonArray, shortAddress } from "@/lib/api";
import { mapMarket, writeAudit } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected", "needs_info"]),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const rows = await db`SELECT * FROM verifications ORDER BY created_at DESC` as Record<string, unknown>[];
  const data = rows.map((row) => ({
    id: row.id,
    market: mapMarket(row.marketplace),
    target: row.target,
    owner: shortAddress(row.owner_address),
    ownerAddress: row.owner_address,
    method: row.method,
    status: row.status,
    checks: jsonArray(row.checks),
    filed: row.created_at,
  }));

  return NextResponse.json({ data, total: data.length });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid verification update", parsed.error.flatten());

  await db`UPDATE verifications SET status = ${parsed.data.status}, updated_at = NOW() WHERE id = ${parsed.data.id}`;
  if (parsed.data.status === "approved") {
    await db`
      UPDATE listings
      SET collateral_data = COALESCE(collateral_data, '{}'::jsonb) || '{"verified": true}'::jsonb,
          updated_at = NOW()
      WHERE id = (SELECT listing_id FROM verifications WHERE id = ${parsed.data.id})
    `;
  }
  await writeAudit(`VERIFICATION_${parsed.data.status.toUpperCase()}`, parsed.data.id, `Verification status changed to ${parsed.data.status}`, "admin", auth.user.address);

  return NextResponse.json({ data: parsed.data });
}
