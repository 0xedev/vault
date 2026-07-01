import { NextRequest, NextResponse } from "next/server";
import { actorAddressForRequest, requireUser } from "@/lib/auth";
import { decryptMessage } from "@/lib/crypto";
import { ensureListingMessagesSchema, listingThreadKey } from "@/lib/listing-messages";
import { resolveHypersnapNames, shortAddress } from "@/lib/hypersnap";

function decryptPreview(listingId: string, buyerAddress: string, body: unknown) {
  try {
    return decryptMessage(listingThreadKey(listingId, buyerAddress), String(body || ""));
  } catch {
    return "[encrypted message]";
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const db = auth.db;
  await ensureListingMessagesSchema(db);

  const url = new URL(req.url);
  const actorAddress = actorAddressForRequest(auth.user, url.searchParams.get("walletAddress")).toLowerCase();

  const rows = await db`
    SELECT DISTINCT ON (lm.listing_id, lm.buyer_address)
      lm.listing_id,
      lm.buyer_address,
      lm.seller_address,
      lm.sender_address,
      lm.body,
      lm.created_at,
      l.title,
      l.marketplace,
      (
        SELECT COUNT(*)
        FROM listing_messages unread
        WHERE unread.listing_id = lm.listing_id
          AND unread.buyer_address = lm.buyer_address
          AND unread.sender_address <> ${actorAddress}
          AND unread.read_at IS NULL
      ) AS unread_count
    FROM listing_messages lm
    JOIN listings l ON l.id = lm.listing_id
    WHERE lm.buyer_address = ${actorAddress} OR lm.seller_address = ${actorAddress}
    ORDER BY lm.listing_id, lm.buyer_address, lm.created_at DESC
  ` as Record<string, unknown>[];

  const names = await resolveHypersnapNames(rows.flatMap((row) => [
    row.buyer_address,
    row.seller_address,
    row.sender_address,
  ]));

  const data = rows
    .map((row) => {
      const buyerAddress = String(row.buyer_address || "").toLowerCase();
      const sellerAddress = String(row.seller_address || "").toLowerCase();
      const counterparty = actorAddress === sellerAddress ? buyerAddress : sellerAddress;
      const lastSender = String(row.sender_address || "").toLowerCase();
      return {
        listingId: String(row.listing_id),
        listingTitle: String(row.title || "Listing"),
        marketplace: String(row.marketplace || ""),
        buyerAddress,
        sellerAddress,
        counterpartyAddress: counterparty,
        counterpartyName: names[counterparty]?.name || shortAddress(counterparty),
        lastSenderAddress: lastSender,
        lastSenderName: names[lastSender]?.name || shortAddress(lastSender),
        preview: decryptPreview(String(row.listing_id), buyerAddress, row.body),
        createdAt: String(row.created_at),
        unreadCount: Number(row.unread_count || 0),
        role: actorAddress === sellerAddress ? "seller" : "buyer",
      };
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return NextResponse.json({ data, total: data.length });
}
