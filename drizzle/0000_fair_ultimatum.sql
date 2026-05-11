CREATE TYPE "public"."dispute_status" AS ENUM('open', 'evidence', 'review', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."escrow_stage" AS ENUM('awaiting_deposit', 'funds_locked', 'asset_transferred', 'awaiting_confirmation', 'released', 'disputed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'funded', 'completed', 'disputed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."marketplace_kind" AS ENUM('nft_loan', 'mini_app', 'x_account', 'farcaster', 'otc');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" text PRIMARY KEY NOT NULL,
	"escrow_id" text NOT NULL,
	"filer_address" text NOT NULL,
	"against_address" text NOT NULL,
	"reason" text NOT NULL,
	"evidence_hashes" jsonb,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"resolution" jsonb,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrows" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text,
	"buyer_address" text NOT NULL,
	"seller_address" text NOT NULL,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'ETH' NOT NULL,
	"stage" "escrow_stage" DEFAULT 'awaiting_deposit' NOT NULL,
	"contract_address" text,
	"tx_hash" text,
	"deadline" timestamp,
	"deliverables" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_address" text NOT NULL,
	"marketplace" "marketplace_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price" real NOT NULL,
	"currency" text DEFAULT 'ETH' NOT NULL,
	"collateral_data" jsonb,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"terms" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"offerer_address" text NOT NULL,
	"amount" real NOT NULL,
	"apr" real,
	"term_days" integer,
	"expires_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"escrow_id" text,
	"from_address" text NOT NULL,
	"to_address" text,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'ETH' NOT NULL,
	"tx_type" text NOT NULL,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"address" text PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"trades" integer DEFAULT 0 NOT NULL,
	"reputation" real DEFAULT 0 NOT NULL,
	"locked_balance" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_escrow_id_escrows_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "public"."escrows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_filer_address_users_address_fk" FOREIGN KEY ("filer_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_against_address_users_address_fk" FOREIGN KEY ("against_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_buyer_address_users_address_fk" FOREIGN KEY ("buyer_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_seller_address_users_address_fk" FOREIGN KEY ("seller_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_address_users_address_fk" FOREIGN KEY ("seller_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_offerer_address_users_address_fk" FOREIGN KEY ("offerer_address") REFERENCES "public"."users"("address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_escrow_id_escrows_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "public"."escrows"("id") ON DELETE no action ON UPDATE no action;