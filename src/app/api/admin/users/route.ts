import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, shortAddress } from "@/lib/api";
import { writeAudit } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

const patchSchema = z.object({
  address: z.string().min(1),
  status: z.enum(["active", "frozen", "banned"]),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const rows = await db`
    SELECT u.*, COALESCE(SUM(e.amount), 0) AS locked
    FROM users u
    LEFT JOIN escrows e ON (e.buyer_address = u.address OR e.seller_address = u.address) AND e.stage NOT IN ('released', 'refunded')
    GROUP BY u.address
    ORDER BY u.joined_at DESC
  ` as Record<string, unknown>[];

  const data = rows.map((row) => ({
    addr: shortAddress(row.address),
    address: row.address,
    handle: row.handle || "",
    joined: row.joined_at,
    trades: Number(row.trades || 0),
    kyc: row.kyc_tier || "none",
    flags: Number(row.flags || 0),
    locked: Number(row.locked || 0),
    status: row.status || "active",
  }));

  return NextResponse.json({ data, total: data.length });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid user status update", parsed.error.flatten());

  await db`UPDATE users SET status = ${parsed.data.status} WHERE address = ${parsed.data.address}`;
  await writeAudit(`USER_${parsed.data.status.toUpperCase()}`, parsed.data.address, `User status changed to ${parsed.data.status}`, "admin", auth.user.address);

  return NextResponse.json({ data: parsed.data });
}
