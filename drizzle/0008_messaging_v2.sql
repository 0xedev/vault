-- Phase 1: Messaging v2 schema
-- New columns on deal_messages
ALTER TABLE deal_messages
  ADD COLUMN IF NOT EXISTS read_at      TIMESTAMP,
  ADD COLUMN IF NOT EXISTS image_url    TEXT,
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' NOT NULL;

-- Index for cursor-based pagination
CREATE INDEX IF NOT EXISTS idx_deal_messages_escrow_created
  ON deal_messages (escrow_id, created_at DESC);

-- Notification tokens for push/email
CREATE TABLE IF NOT EXISTS notification_tokens (
  id            TEXT PRIMARY KEY,
  user_address  TEXT NOT NULL REFERENCES users(address),
  platform      TEXT NOT NULL,
  token         TEXT NOT NULL,
  verified      BOOLEAN DEFAULT false,
  created_at    TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(user_address, platform)
);

-- API keys for HMAC auth
CREATE TABLE IF NOT EXISTS api_keys (
  id              TEXT PRIMARY KEY,
  user_address    TEXT NOT NULL REFERENCES users(address),
  label           TEXT DEFAULT '',
  api_key         TEXT UNIQUE NOT NULL,
  secret_hash     TEXT NOT NULL,
  passphrase_hash TEXT NOT NULL,
  last_used_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT now() NOT NULL
);

-- New escrow stages for 3-step flow
ALTER TYPE escrow_stage ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE escrow_stage ADD VALUE IF NOT EXISTS 'paid';
