ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "offer_type" text DEFAULT 'signed' NOT NULL;
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "signature" text;
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "nonce" text;
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "typed_data" jsonb;
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "marketplace" text;
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "contract_listing_id" text;
