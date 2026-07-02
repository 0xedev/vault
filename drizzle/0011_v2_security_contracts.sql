ALTER TYPE "public"."marketplace_kind" ADD VALUE IF NOT EXISTS 'bundle';
ALTER TYPE "public"."escrow_stage" ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE "public"."escrow_stage" ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE "public"."escrow_stage" ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE "notification_tokens"
  ALTER COLUMN "verified" DROP DEFAULT,
  ALTER COLUMN "verified" TYPE boolean
    USING CASE
      WHEN lower("verified"::text) IN ('true', 't', '1', 'yes', 'y') THEN true
      ELSE false
    END,
  ALTER COLUMN "verified" SET DEFAULT false,
  ALTER COLUMN "verified" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "linked_wallets" (
  "id" text PRIMARY KEY,
  "farcaster_address" text NOT NULL REFERENCES "users"("address") ON DELETE CASCADE,
  "wallet_address" text NOT NULL REFERENCES "users"("address") ON DELETE CASCADE,
  "chain_id" integer,
  "verified_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "linked_wallets_farcaster_wallet_unique"
  ON "linked_wallets" ("farcaster_address", "wallet_address");
CREATE INDEX IF NOT EXISTS "linked_wallets_wallet_idx"
  ON "linked_wallets" ("wallet_address");

CREATE TABLE IF NOT EXISTS "contracts" (
  "id" text PRIMARY KEY,
  "chain_id" integer NOT NULL,
  "kind" text NOT NULL,
  "version" text NOT NULL,
  "address" text NOT NULL,
  "role" text DEFAULT 'active' NOT NULL,
  "active" boolean DEFAULT false NOT NULL,
  "deployed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "contracts_chain_kind_address_unique"
  ON "contracts" ("chain_id", "kind", lower("address"));
CREATE INDEX IF NOT EXISTS "contracts_active_idx"
  ON "contracts" ("chain_id", "kind", "version")
  WHERE "active" = true;

ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "secret_ciphertext" text;
