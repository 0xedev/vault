import type { DbClient } from "@/lib/api";
import { Resend } from "resend";

let _resend: Resend | null = null;
function resend() {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

interface EscrowInfo {
  id: string;
  buyer_address: string;
  seller_address: string;
}

export async function notifyCounterparty(
  db: DbClient,
  escrow: EscrowInfo,
  senderAddress: string,
  messagePreview: string,
) {
  const counterparty = escrow.buyer_address.toLowerCase() === senderAddress.toLowerCase()
    ? escrow.seller_address
    : escrow.buyer_address;

  const tokens = await db`
    SELECT platform, token FROM notification_tokens
    WHERE user_address = ${counterparty} AND verified = true
  ` as Record<string, unknown>[];

  for (const row of tokens) {
    const platform = String(row.platform);
    if (platform === "email") {
      await sendEmail(counterparty, String(row.token), escrow.id, messagePreview);
    }
    // Farcaster notifications are handled client-side via the mini-app SDK
  }
}

async function sendEmail(
  _counterparty: string,
  to: string,
  escrowId: string,
  message: string,
) {
  const client = resend();
  if (!client) return;

  await client.emails.send({
    from: "Baseshire Hethaway <deals@baseshirehethaway.com>",
    to,
    subject: `New message in Deal Room — ${escrowId}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0052ff;font-weight:600">Baseshire Hethaway</h2>
        <p>You have a new message in your deal room:</p>
        <blockquote style="background:#f1f5f9;border-left:3px solid #0052ff;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0">
          ${message.slice(0, 300)}${message.length > 300 ? "…" : ""}
        </blockquote>
        <a href="https://baseshirehethaway.com/deals?id=${escrowId}"
           style="display:inline-block;background:#0052ff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Open Deal Room
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          Reply directly in the app. To stop receiving emails, update your notification settings in Baseshire Hethaway.
        </p>
      </div>
    `,
  }).catch(() => {});
}
