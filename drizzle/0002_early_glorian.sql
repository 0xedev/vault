CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text DEFAULT 'system' NOT NULL,
	"actor_address" text,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"note" text,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"address" text,
	"consumed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"escrow_id" text NOT NULL,
	"sender_address" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrow_proofs" (
	"id" text PRIMARY KEY NOT NULL,
	"escrow_id" text NOT NULL,
	"actor_address" text NOT NULL,
	"proof_type" text NOT NULL,
	"url" text NOT NULL,
	"content_hash" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"from_address" text,
	"subject" text NOT NULL,
	"body" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"unread" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_cursors" (
	"id" text PRIMARY KEY NOT NULL,
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"last_synced_block" text DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"verification_id" text,
	"listing_id" text,
	"owner_address" text NOT NULL,
	"method" text NOT NULL,
	"target" text NOT NULL,
	"status" text NOT NULL,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text,
	"marketplace" "marketplace_kind" NOT NULL,
	"target" text NOT NULL,
	"owner_address" text NOT NULL,
	"method" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"checks" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escrows" ADD COLUMN "chain_id" integer;--> statement-breakpoint
ALTER TABLE "escrows" ADD COLUMN "contract_listing_id" text;--> statement-breakpoint
ALTER TABLE "escrows" ADD COLUMN "tx_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "moderation_status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "flagged_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "risk_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "chain_id" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "contract_address" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "contract_listing_id" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "tx_hash" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "tx_status" text DEFAULT 'offchain' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "chain_id" integer;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "tx_hash" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "tx_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "listing_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "chain_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyc_tier" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "flags" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "deal_messages" ADD CONSTRAINT "deal_messages_escrow_id_escrows_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "public"."escrows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_messages" ADD CONSTRAINT "deal_messages_sender_address_users_address_fk" FOREIGN KEY ("sender_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_proofs" ADD CONSTRAINT "escrow_proofs_escrow_id_escrows_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "public"."escrows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_proofs" ADD CONSTRAINT "escrow_proofs_actor_address_users_address_fk" FOREIGN KEY ("actor_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_address_users_address_fk" FOREIGN KEY ("address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_from_address_users_address_fk" FOREIGN KEY ("from_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_attempts" ADD CONSTRAINT "verification_attempts_verification_id_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."verifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_attempts" ADD CONSTRAINT "verification_attempts_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_attempts" ADD CONSTRAINT "verification_attempts_owner_address_users_address_fk" FOREIGN KEY ("owner_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_owner_address_users_address_fk" FOREIGN KEY ("owner_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;