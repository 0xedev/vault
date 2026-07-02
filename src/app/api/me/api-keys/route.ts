import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { encryptApiSecret, generateApiKey, hashSecret } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const rows = await auth.db`
    SELECT id, label, api_key, last_used_at, created_at
    FROM api_keys WHERE user_address = ${auth.user.address}
    ORDER BY created_at DESC
  ` as Record<string, unknown>[];

  const data = rows.map(r => ({
    id: r.id,
    label: r.label,
    apiKey: String(r.api_key),
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ data });
}

const createSchema = z.object({
  label: z.string().max(50).default(""),
  passphrase: z.string().min(4).max(100),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten());

  const { apiKey, secret } = generateApiKey();
  const secretHash = hashSecret(secret);
  const secretCiphertext = encryptApiSecret(apiKey, secret);
  const passHash = hashSecret(parsed.data.passphrase);
  const id = `AK-${Date.now()}`;

  await auth.db`
    INSERT INTO api_keys (id, user_address, label, api_key, secret_hash, secret_ciphertext, passphrase_hash)
    VALUES (${id}, ${auth.user.address}, ${parsed.data.label}, ${apiKey}, ${secretHash}, ${secretCiphertext}, ${passHash})
  `;

  return NextResponse.json({
    data: { id, label: parsed.data.label, apiKey, secret },
    note: "Store the secret securely — it will not be shown again.",
  }, { status: 201 });
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten());

  await auth.db`DELETE FROM api_keys WHERE id = ${parsed.data.id} AND user_address = ${auth.user.address}`;
  return NextResponse.json({ ok: true });
}
