import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const rows = await auth.db`
    SELECT platform, token, verified, created_at
    FROM notification_tokens WHERE user_address = ${auth.user.address}
  ` as Record<string, unknown>[];

  return NextResponse.json({ data: rows });
}

const upsertSchema = z.object({
  platform: z.enum(["email"]),
  token: z.string().email(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten());

  const id = `NT-${Date.now()}`;
  await auth.db`
    INSERT INTO notification_tokens (id, user_address, platform, token, verified)
    VALUES (${id}, ${auth.user.address}, ${parsed.data.platform}, ${parsed.data.token}, true)
    ON CONFLICT (user_address, platform)
    DO UPDATE SET token = ${parsed.data.token}, verified = true
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}

const deleteSchema = z.object({
  platform: z.enum(["email"]),
});

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten());

  await auth.db`
    DELETE FROM notification_tokens
    WHERE user_address = ${auth.user.address} AND platform = ${parsed.data.platform}
  `;

  return NextResponse.json({ ok: true });
}
