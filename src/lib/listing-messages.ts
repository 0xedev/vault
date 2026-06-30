import { type DbClient } from "@/lib/api";
import { decryptMessage, encryptMessage } from "@/lib/crypto";

let listingMessagesSchemaPromise: Promise<void> | null = null;

export function listingThreadKey(listingId: string, buyerAddress: string) {
  return `listing:${listingId}:${buyerAddress.toLowerCase()}`;
}

export function ensureListingMessagesSchema(db: DbClient) {
  listingMessagesSchemaPromise ||= (async () => {
    await db`
      CREATE TABLE IF NOT EXISTS "listing_messages" (
        "id" text PRIMARY KEY NOT NULL,
        "listing_id" text NOT NULL REFERENCES "listings"("id"),
        "buyer_address" text NOT NULL REFERENCES "users"("address"),
        "seller_address" text NOT NULL REFERENCES "users"("address"),
        "sender_address" text NOT NULL REFERENCES "users"("address"),
        "body" text NOT NULL,
        "read_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    await db`
      CREATE INDEX IF NOT EXISTS idx_listing_messages_listing_buyer_created
      ON "listing_messages" ("listing_id", "buyer_address", "created_at" DESC)
    `;
  })().catch((err) => {
    listingMessagesSchemaPromise = null;
    throw err;
  });
  return listingMessagesSchemaPromise;
}

export async function copyListingMessagesToDeal(args: {
  db: DbClient;
  listingId?: string | null;
  buyerAddress?: string | null;
  escrowId: string;
}) {
  const listingId = args.listingId;
  const buyerAddress = args.buyerAddress?.toLowerCase();
  if (!listingId || !buyerAddress) return;

  await ensureListingMessagesSchema(args.db);
  const rows = await args.db`
    SELECT * FROM listing_messages
    WHERE listing_id = ${listingId} AND buyer_address = ${buyerAddress}
    ORDER BY created_at ASC
  ` as Record<string, unknown>[];

  for (const row of rows) {
    let body = "";
    try {
      body = decryptMessage(listingThreadKey(listingId, buyerAddress), String(row.body || ""));
    } catch {
      body = "[encrypted message]";
    }
    const copiedId = `DM-${String(row.id)}`;
    const ciphertext = encryptMessage(args.escrowId, body);
    await args.db`
      INSERT INTO deal_messages (id, escrow_id, sender_address, body, message_type, image_url, created_at)
      VALUES (${copiedId}, ${args.escrowId}, ${String(row.sender_address)}, ${ciphertext}, 'text', null, ${row.created_at as Date})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}
