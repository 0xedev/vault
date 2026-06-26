import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { decryptMessage } from "@/lib/crypto";
import { writeAudit } from "@/lib/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: escrowId } = await params;
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  const dispute = await auth.db`
    SELECT id FROM disputes
    WHERE escrow_id = ${escrowId} AND status = 'open'
    LIMIT 1
  ` as Record<string, unknown>[];
  if (dispute.length === 0) {
    return NextResponse.json({ error: "No active dispute for this escrow" }, { status: 403 });
  }

  const rows = await auth.db`
    SELECT * FROM deal_messages
    WHERE escrow_id = ${escrowId}
    ORDER BY created_at ASC
  ` as Record<string, unknown>[];

  await writeAudit(
    "ADMIN_VIEWED_MESSAGES", escrowId,
    "Admin viewed all messages for disputed escrow",
    "admin", auth.user.address,
  );

  const messages = rows.map(r => {
    let body: string;
    try { body = decryptMessage(escrowId, String(r.body)); }
    catch { body = "[encrypted message]"; }

    return {
      id: r.id,
      senderAddress: r.sender_address,
      body,
      messageType: r.message_type || "text",
      imageUrl: r.image_url,
      readAt: r.read_at,
      createdAt: r.created_at,
    };
  });

  return NextResponse.json({ data: messages });
}
