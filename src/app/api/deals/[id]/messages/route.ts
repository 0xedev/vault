import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, shortAddress } from "@/lib/api";
import { actorAddressForRequest, requireUser } from "@/lib/auth";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { notifyCounterparty } from "@/lib/notifications";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

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

  const escrowRows = await db`SELECT id, buyer_address, seller_address FROM escrows WHERE id = ${escrowId} AND (buyer_address = ${actorAddress} OR seller_address = ${actorAddress}) LIMIT 1` as Record<string, unknown>[];
  if (escrowRows.length === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const cursor = url.searchParams.get("cursor");

  const rows = cursor
    ? await db`SELECT * FROM deal_messages WHERE escrow_id = ${escrowId} AND created_at < ${cursor}::timestamptz ORDER BY created_at DESC LIMIT ${limit}` as Record<string, unknown>[]
    : await db`SELECT * FROM deal_messages WHERE escrow_id = ${escrowId} ORDER BY created_at DESC LIMIT ${limit}` as Record<string, unknown>[];

  const reversed = [...rows].reverse();

  const messages = reversed.map((r) => {
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
      messageType: String(r.message_type || "text"),
      imageUrl: r.image_url || null,
      readAt: r.read_at || null,
      createdAt: String(r.created_at),
      me: String(r.sender_address).toLowerCase() === actorAddress,
    };
  });

  const nextCursor = rows.length === limit ? String(rows[rows.length - 1].created_at) : null;

  return NextResponse.json({
    data: messages,
    nextCursor,
    hasMore: rows.length === limit,
  });
}

const sendSchema = z.object({
  actorAddress: z.string().startsWith("0x").length(42).optional(),
  body: z.string().max(5000).default(""),
  messageType: z.enum(["text", "image"]).default("text"),
  imageUrl: z.string().url().optional(),
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

  const escrowRows = await db`
    SELECT id, buyer_address, seller_address
    FROM escrows WHERE id = ${escrowId}
      AND (buyer_address = ${actorAddress} OR seller_address = ${actorAddress})
    LIMIT 1
  ` as Record<string, unknown>[];
  if (escrowRows.length === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const id = `M-${Date.now()}`;
  const displayBody = parsed.data.messageType === "image"
    ? (parsed.data.body || "[Image]")
    : parsed.data.body || "";
  const ciphertext = encryptMessage(escrowId, displayBody);

  await db`
    INSERT INTO deal_messages (id, escrow_id, sender_address, body, message_type, image_url)
    VALUES (${id}, ${escrowId}, ${actorAddress}, ${ciphertext}, ${parsed.data.messageType}, ${parsed.data.imageUrl || null})
  `;

  const messageData = {
    id,
    sender: shortAddress(actorAddress),
    senderAddress: actorAddress,
    body: displayBody,
    messageType: parsed.data.messageType,
    imageUrl: parsed.data.imageUrl || null,
    createdAt: new Date().toISOString(),
    me: false,
  };

  pusher.trigger(`private-deal-${escrowId}`, "new-message", messageData).catch(() => {});

  const msgPreview = displayBody.length > 100 ? displayBody.slice(0, 97) + "..." : displayBody;
  notifyCounterparty(db, {
    id: escrowId,
    buyer_address: String(escrowRows[0].buyer_address),
    seller_address: String(escrowRows[0].seller_address),
  }, actorAddress, msgPreview);

  return NextResponse.json({
    data: { ...messageData, me: true },
  }, { status: 201 });
}
