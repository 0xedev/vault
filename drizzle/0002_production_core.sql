ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "chain_id" integer;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "contract_address" text;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "contract_listing_id" text;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "tx_hash" text;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "tx_status" text DEFAULT 'offchain' NOT NULL;

ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "chain_id" integer;
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "tx_hash" text;
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "tx_status" text DEFAULT 'pending' NOT NULL;

ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "chain_id" integer;
ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "contract_listing_id" text;
ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "tx_status" text DEFAULT 'pending' NOT NULL;

ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "listing_id" text REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "chain_id" integer;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending' NOT NULL;

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actor_address" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "tx_hash" text;

ALTER TABLE "verifications" ADD COLUMN IF NOT EXISTS "listing_id" text REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;

CREATE TABLE IF NOT EXISTS "auth_nonces" (
  "nonce" text PRIMARY KEY NOT NULL,
  "address" text,
  "consumed_at" timestamp,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "address" text NOT NULL REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action,
  "role" "user_role" DEFAULT 'user' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sync_cursors" (
  "id" text PRIMARY KEY NOT NULL,
  "chain_id" integer NOT NULL,
  "contract_address" text NOT NULL,
  "last_synced_block" text DEFAULT '0' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "escrow_proofs" (
  "id" text PRIMARY KEY NOT NULL,
  "escrow_id" text NOT NULL REFERENCES "public"."escrows"("id") ON DELETE no action ON UPDATE no action,
  "actor_address" text NOT NULL REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action,
  "proof_type" text NOT NULL,
  "url" text NOT NULL,
  "content_hash" text NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "deal_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "escrow_id" text NOT NULL REFERENCES "public"."escrows"("id") ON DELETE no action ON UPDATE no action,
  "sender_address" text NOT NULL REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification_attempts" (
  "id" text PRIMARY KEY NOT NULL,
  "verification_id" text REFERENCES "public"."verifications"("id") ON DELETE no action ON UPDATE no action,
  "listing_id" text REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action,
  "owner_address" text NOT NULL REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action,
  "method" text NOT NULL,
  "target" text NOT NULL,
  "status" text NOT NULL,
  "result" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
