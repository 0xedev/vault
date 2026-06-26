import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const { socket_id, channel_name } = await req.json();
  if (!socket_id || !channel_name) {
    return NextResponse.json({ error: "socket_id and channel_name are required" }, { status: 400 });
  }

  const escrowId = channel_name.replace("private-deal-", "");
  if (!escrowId || escrowId === channel_name) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const rows = await auth.db`
    SELECT id FROM escrows
    WHERE id = ${escrowId}
      AND (buyer_address = ${auth.user.address} OR seller_address = ${auth.user.address})
    LIMIT 1
  ` as Record<string, unknown>[];
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not a participant of this deal" }, { status: 403 });
  }

  const authResponse = pusher.authorizeChannel(socket_id, channel_name);
  return NextResponse.json(authResponse);
}
