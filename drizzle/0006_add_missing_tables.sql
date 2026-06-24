-- Fix: create missing listing_assets table
CREATE TABLE IF NOT EXISTS "listing_assets" (
  "id" text PRIMARY KEY NOT NULL,
  "listing_id" text NOT NULL REFERENCES "listings"("id"),
  "asset_type" "marketplace_kind" NOT NULL,
  "asset_data" jsonb NOT NULL,
  "position" integer DEFAULT 0 NOT NULL
);

-- Fix: create missing rate_limits table
CREATE TABLE IF NOT EXISTS "rate_limits" (
  "key" text PRIMARY KEY NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "reset_at" timestamp NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
