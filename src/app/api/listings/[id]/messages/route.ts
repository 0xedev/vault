import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, shortAddress } from "@/lib/api";
import { actorAddressForRequest, requireUser } from "@/lib/auth";
import { decryptMessage, encryptMessage } from "@/lib/crypto";
import { ensureListingMessagesSchema, listingThreadKey } from "@/lib/listing-messages";

function mapMessage(row: Record<string, unknown>, actorAddress: string, listingId: string) {
  const buyerAddress = String(row.buyer_address || "");
  let body = "";
  try {
    body = decryptMessage(listingThreadKey(listingId, buyerAddress), String(row.body || ""));
  } catch {
    body = "[encrypted message]";
  }
  return {
    id: String(row.id),
    listingId,
    buyerAddress,
    sellerAddress: String(row.seller_address || ""),
    sender: shortAddress(row.sender_address),
    senderAddress: String(row.sender_address || ""),
    body,
    readAt: row.read_at || null,
    createdAt: String(row.created_at),
    me: String(row.sender_address || "").toLowerCase() === actorAddress.toLowerCase(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listingId } = await params;
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;
  await ensureListingMessagesSchema(db);

  const url = new URL(req.url);
  const actorAddress = actorAddressForRequest(auth.user, url.searchParams.get("walletAddress"));
  const buyerParam = url.searchParams.get("buyerAddress");

  const listingRows = await db`
    SELECT id, seller_address, title FROM listings WHERE id = ${listingId} LIMIT 1
  ` as Record<string, unknown>[];
  if (listingRows.length === 0) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const sellerAddress = String(listingRows[0].seller_address || "").toLowerCase();
  const isSeller = actorAddress.toLowerCase() === sellerAddress;
  const buyerAddress = isSeller && buyerParam ? buyerParam.toLowerCase() : actorAddress.toLowerCase();

  if (isSeller && !buyerParam) {
    const threads = await db`
      SELECT DISTINCT ON (buyer_address)
        buyer_address,
        sender_address,
        body,
        created_at
      FROM listing_messages
      WHERE listing_id = ${listingId} AND seller_address = ${actorAddress}
      ORDER BY buyer_address, created_at DESC
    ` as Record<string, unknown>[];

    return NextResponse.json({
      listing: { id: listingId, title: String(listingRows[0].title || "Listing") },
      threads: threads.map((thread) => {
        const buyer = String(thread.buyer_address || "");
        let preview = "";
        try {
          preview = decryptMessage(listingThreadKey(listingId, buyer), String(thread.body || ""));
        } catch {
          preview = "[encrypted message]";
        }
        return {
          buyerAddress: buyer,
          buyer: shortAddress(buyer),
          lastSender: shortAddress(thread.sender_address),
          preview,
          createdAt: String(thread.created_at),
        };
      }),
      data: [],
    });
  }

  if (isSeller && buyerAddress === sellerAddress) {
    return badRequest("buyerAddress is required to view a buyer conversation.");
  }

  const rows = await db`
    SELECT * FROM listing_messages
    WHERE listing_id = ${listingId}
      AND buyer_address = ${buyerAddress}
      AND (seller_address = ${actorAddress} OR buyer_address = ${actorAddress})
    ORDER BY created_at ASC
    LIMIT 100
  ` as Record<string, unknown>[];

  return NextResponse.json({
    listing: { id: listingId, title: String(listingRows[0].title || "Listing") },
    data: rows.map((row) => mapMessage(row, actorAddress, listingId)),
  });
}

const sendSchema = z.object({
  actorAddress: z.string().startsWith("0x").length(42).optional(),
  buyerAddress: z.string().startsWith("0x").length(42).optional(),
  body: z.string().trim().min(1).max(5000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listingId } = await params;
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;
  await ensureListingMessagesSchema(db);

  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid message", parsed.error.flatten());

  const actorAddress = actorAddressForRequest(auth.user, parsed.data.actorAddress).toLowerCase();
  const listingRows = await db`
    SELECT id, seller_address FROM listings WHERE id = ${listingId} AND status <> 'cancelled' LIMIT 1
  ` as Record<string, unknown>[];
  if (listingRows.length === 0) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const sellerAddress = String(listingRows[0].seller_address || "").toLowerCase();
  const isSeller = actorAddress === sellerAddress;
  const buyerAddress = isSeller ? parsed.data.buyerAddress?.toLowerCase() : actorAddress;
  if (!buyerAddress) return badRequest("buyerAddress is required for seller replies.");
  if (buyerAddress === sellerAddress) return badRequest("Buyer and seller must be different addresses.");

  if (isSeller) {
    const existingThread = await db`
      SELECT id FROM listing_messages
      WHERE listing_id = ${listingId} AND buyer_address = ${buyerAddress} AND seller_address = ${sellerAddress}
      LIMIT 1
    ` as Record<string, unknown>[];
    if (existingThread.length === 0) {
      return NextResponse.json({ error: "No buyer conversation exists for this listing yet." }, { status: 404 });
    }
  }

  await db`INSERT INTO users (address) VALUES (${buyerAddress}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO users (address) VALUES (${sellerAddress}) ON CONFLICT (address) DO NOTHING`;

  const id = `LM-${Date.now()}`;
  const ciphertext = encryptMessage(listingThreadKey(listingId, buyerAddress), parsed.data.body);
  const inserted = await db`
    INSERT INTO listing_messages (id, listing_id, buyer_address, seller_address, sender_address, body)
    VALUES (${id}, ${listingId}, ${buyerAddress}, ${sellerAddress}, ${actorAddress}, ${ciphertext})
    RETURNING *
  ` as Record<string, unknown>[];

  return NextResponse.json({
    data: mapMessage(inserted[0], actorAddress, listingId),
  }, { status: 201 });
}
