import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, shortAddress } from "@/lib/api";
import { actorAddressForRequest, requireUser } from "@/lib/auth";
import { encryptMessage, decryptMessage } from "@/lib/crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: escrowId } = await params;
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;
  const url = new URL(req.url);
  const actorAddress = actorAddressForRequest(auth.user, url.searchParams.get("walletAddress"));

  const escrowRows = await db`SELECT id FROM escrows WHERE id = ${escrowId} AND (buyer_address = ${actorAddress} OR seller_address = ${actorAddress}) LIMIT 1` as Record<string, unknown>[];
  if (escrowRows.length === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const rows = await db`SELECT * FROM deal_messages WHERE escrow_id = ${escrowId} ORDER BY created_at ASC LIMIT 200` as Record<string, unknown>[];

  const messages = rows.map((r) => {
    let body: string;
    try {
      body = decryptMessage(escrowId, String(r.body));
    } catch {
      body = "[encrypted message]";
    }
    return {
      id: String(r.id),
      sender: shortAddress(r.sender_address),
      senderAddress: String(r.sender_address),
      body,
      createdAt: String(r.created_at),
      me: String(r.sender_address).toLowerCase() === actorAddress,
    };
  });

  return NextResponse.json({ data: messages });
}

const sendSchema = z.object({
  actorAddress: z.string().startsWith("0x").length(42).optional(),
  body: z.string().min(1).max(5000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: escrowId } = await params;
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid message", parsed.error.flatten());
  const actorAddress = actorAddressForRequest(auth.user, parsed.data.actorAddress);

  const escrowRows = await db`SELECT id FROM escrows WHERE id = ${escrowId} AND (buyer_address = ${actorAddress} OR seller_address = ${actorAddress}) LIMIT 1` as Record<string, unknown>[];
  if (escrowRows.length === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const id = `M-${Date.now()}`;
  const ciphertext = encryptMessage(escrowId, parsed.data.body);

  await db`INSERT INTO deal_messages (id, escrow_id, sender_address, body) VALUES (${id}, ${escrowId}, ${actorAddress}, ${ciphertext})`;

  return NextResponse.json({
    data: {
      id,
      sender: shortAddress(actorAddress),
      senderAddress: actorAddress,
      body: parsed.data.body,
      createdAt: new Date().toISOString(),
      me: true,
    },
  }, { status: 201 });
}
