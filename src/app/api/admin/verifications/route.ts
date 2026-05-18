import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase, jsonArray, shortAddress } from "@/lib/api";
import { mapMarket, writeAudit } from "@/lib/admin";

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected", "needs_info"]),
});

export async function GET() {
  const db = getDatabase();
  if (!db) return databaseRequired();

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
  const db = getDatabase();
  if (!db) return databaseRequired();

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid verification update", parsed.error.flatten());

  await db`UPDATE verifications SET status = ${parsed.data.status}, updated_at = NOW() WHERE id = ${parsed.data.id}`;
  await writeAudit(`VERIFICATION_${parsed.data.status.toUpperCase()}`, parsed.data.id, `Verification status changed to ${parsed.data.status}`);

  return NextResponse.json({ data: parsed.data });
}
