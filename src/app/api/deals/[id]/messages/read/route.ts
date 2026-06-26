import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

const readSchema = z.object({
  messageIds: z.array(z.string()).min(1).max(100),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: escrowId } = await params;
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const escrowRows = await auth.db`
    SELECT id FROM escrows
    WHERE id = ${escrowId}
      AND (buyer_address = ${auth.user.address} OR seller_address = ${auth.user.address})
    LIMIT 1
  ` as Record<string, unknown>[];
  if (escrowRows.length === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const parsed = readSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten());

  await auth.db`
    UPDATE deal_messages
    SET read_at = NOW()
    WHERE escrow_id = ${escrowId}
      AND id = ANY(${parsed.data.messageIds})
      AND sender_address <> ${auth.user.address}
      AND read_at IS NULL
  `;

  pusher.trigger(`private-deal-${escrowId}`, "messages-read", {
    messageIds: parsed.data.messageIds,
    readBy: auth.user.address,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
