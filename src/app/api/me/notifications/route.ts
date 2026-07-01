import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";
import { actorAddressForRequest, requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const url = new URL(req.url);
  const actorAddress = actorAddressForRequest(auth.user, url.searchParams.get("walletAddress"));

  const rows = await auth.db`
    SELECT platform, token, verified, created_at
    FROM notification_tokens WHERE user_address = ${actorAddress}
  ` as Record<string, unknown>[];

  return NextResponse.json({ data: rows });
}

const upsertSchema = z.object({
  platform: z.enum(["email"]),
  token: z.string().email(),
  walletAddress: z.string().startsWith("0x").length(42).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten());
  const actorAddress = actorAddressForRequest(auth.user, parsed.data.walletAddress);

  const id = `NT-${Date.now()}`;
  await auth.db`
    INSERT INTO notification_tokens (id, user_address, platform, token, verified)
    VALUES (${id}, ${actorAddress}, ${parsed.data.platform}, ${parsed.data.token}, true)
    ON CONFLICT (user_address, platform)
    DO UPDATE SET token = ${parsed.data.token}, verified = true
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}

const deleteSchema = z.object({
  platform: z.enum(["email"]),
  walletAddress: z.string().startsWith("0x").length(42).optional(),
});

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten());
  const actorAddress = actorAddressForRequest(auth.user, parsed.data.walletAddress);

  await auth.db`
    DELETE FROM notification_tokens
    WHERE user_address = ${actorAddress} AND platform = ${parsed.data.platform}
  `;

  return NextResponse.json({ ok: true });
}
