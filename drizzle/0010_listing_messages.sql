CREATE TABLE IF NOT EXISTS "listing_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "listing_id" text NOT NULL REFERENCES "listings"("id"),
  "buyer_address" text NOT NULL REFERENCES "users"("address"),
  "seller_address" text NOT NULL REFERENCES "users"("address"),
  "sender_address" text NOT NULL REFERENCES "users"("address"),
  "body" text NOT NULL,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listing_messages_listing_buyer_created
  ON "listing_messages" ("listing_id", "buyer_address", "created_at" DESC);
