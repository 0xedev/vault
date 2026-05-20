import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, shortAddress } from "@/lib/api";
import { writeAudit } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "pending", "resolved"]),
  reply: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const rows = await db`SELECT * FROM support_tickets ORDER BY updated_at DESC` as Record<string, unknown>[];
  const data = rows.map((row) => ({
    id: row.id,
    from: row.from_address ? shortAddress(row.from_address) : "guest",
    fromAddress: row.from_address,
    subj: row.subject,
    body: row.body || "",
    priority: row.priority,
    category: row.category,
    unread: Number(row.unread || 0) > 0,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ data, total: data.length });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid ticket update", parsed.error.flatten());

  await db`UPDATE support_tickets SET status = ${parsed.data.status}, unread = 0, updated_at = NOW() WHERE id = ${parsed.data.id}`;
  await writeAudit(
    parsed.data.status === "resolved" ? "TICKET_RESOLVED" : "TICKET_UPDATED",
    parsed.data.id,
    parsed.data.reply || `Ticket status changed to ${parsed.data.status}`,
    "admin",
    auth.user.address,
  );

  return NextResponse.json({ data: parsed.data });
}
