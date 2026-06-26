ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "is_bundle" text DEFAULT 'false' NOT NULL;
