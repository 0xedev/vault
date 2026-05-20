import { pgTable, text, integer, real, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const listingStatus = pgEnum("listing_status", ["active", "funded", "completed", "disputed", "cancelled"]);
export const escrowStage = pgEnum("escrow_stage", [
  "awaiting_deposit",
  "funds_locked",
  "asset_transferred",
  "awaiting_confirmation",
  "released",
  "disputed",
  "refunded",
]);
export const disputeStatus = pgEnum("dispute_status", ["open", "evidence", "review", "resolved"]);
export const marketplaceKind = pgEnum("marketplace_kind", [
  "nft_loan",
  "mini_app",
  "x_account",
  "farcaster",
  "otc",
]);

export const users = pgTable("users", {
  address: text("address").primaryKey(),
  role: userRole("role").default("user").notNull(),
  handle: text("handle"),
  kycTier: text("kyc_tier").default("none").notNull(),
  flags: integer("flags").default(0).notNull(),
  status: text("status").default("active").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  trades: integer("trades").default(0).notNull(),
  reputation: real("reputation").default(0).notNull(),
  lockedBalance: real("locked_balance").default(0).notNull(),
});

export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  sellerAddress: text("seller_address").references(() => users.address).notNull(),
  marketplace: marketplaceKind("marketplace").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  currency: text("currency").default("ETH").notNull(),
  collateralData: jsonb("collateral_data"),
  status: listingStatus("status").default("active").notNull(),
  moderationStatus: text("moderation_status").default("approved").notNull(),
  flaggedCount: integer("flagged_count").default(0).notNull(),
  riskScore: integer("risk_score").default(0).notNull(),
  chainId: integer("chain_id"),
  contractAddress: text("contract_address"),
  contractListingId: text("contract_listing_id"),
  txHash: text("tx_hash"),
  txStatus: text("tx_status").default("offchain").notNull(),
  terms: jsonb("terms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  fromAddress: text("from_address").references(() => users.address),
  subject: text("subject").notNull(),
  body: text("body"),
  priority: text("priority").default("medium").notNull(),
  category: text("category").default("general").notNull(),
  status: text("status").default("open").notNull(),
  unread: integer("unread").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").references(() => listings.id),
  marketplace: marketplaceKind("marketplace").notNull(),
  target: text("target").notNull(),
  ownerAddress: text("owner_address").references(() => users.address).notNull(),
  method: text("method").notNull(),
  status: text("status").default("pending").notNull(),
  checks: jsonb("checks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actor: text("actor").default("system").notNull(),
  actorAddress: text("actor_address"),
  action: text("action").notNull(),
  target: text("target").notNull(),
  note: text("note"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const offers = pgTable("offers", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").references(() => listings.id).notNull(),
  offererAddress: text("offerer_address").references(() => users.address).notNull(),
  amount: real("amount").notNull(),
  apr: real("apr"),
  termDays: integer("term_days"),
  expiresAt: timestamp("expires_at"),
  status: text("status").default("pending").notNull(),
  chainId: integer("chain_id"),
  txHash: text("tx_hash"),
  txStatus: text("tx_status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const escrows = pgTable("escrows", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").references(() => listings.id),
  buyerAddress: text("buyer_address").references(() => users.address).notNull(),
  sellerAddress: text("seller_address").references(() => users.address).notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").default("ETH").notNull(),
  stage: escrowStage("stage").default("awaiting_deposit").notNull(),
  contractAddress: text("contract_address"),
  chainId: integer("chain_id"),
  contractListingId: text("contract_listing_id"),
  txHash: text("tx_hash"),
  txStatus: text("tx_status").default("pending").notNull(),
  deadline: timestamp("deadline"),
  deliverables: jsonb("deliverables"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(),
  escrowId: text("escrow_id").references(() => escrows.id).notNull(),
  filerAddress: text("filer_address").references(() => users.address).notNull(),
  againstAddress: text("against_address").references(() => users.address).notNull(),
  reason: text("reason").notNull(),
  evidenceHashes: jsonb("evidence_hashes"),
  status: disputeStatus("status").default("open").notNull(),
  priority: text("priority").default("medium").notNull(),
  resolution: jsonb("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  escrowId: text("escrow_id").references(() => escrows.id),
  listingId: text("listing_id").references(() => listings.id),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address"),
  amount: real("amount").notNull(),
  currency: text("currency").default("ETH").notNull(),
  txType: text("tx_type").notNull(),
  txHash: text("tx_hash"),
  chainId: integer("chain_id"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authNonces = pgTable("auth_nonces", {
  nonce: text("nonce").primaryKey(),
  address: text("address"),
  consumedAt: timestamp("consumed_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  address: text("address").references(() => users.address).notNull(),
  role: userRole("role").default("user").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const syncCursors = pgTable("sync_cursors", {
  id: text("id").primaryKey(),
  chainId: integer("chain_id").notNull(),
  contractAddress: text("contract_address").notNull(),
  lastSyncedBlock: text("last_synced_block").default("0").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const escrowProofs = pgTable("escrow_proofs", {
  id: text("id").primaryKey(),
  escrowId: text("escrow_id").references(() => escrows.id).notNull(),
  actorAddress: text("actor_address").references(() => users.address).notNull(),
  proofType: text("proof_type").notNull(),
  url: text("url").notNull(),
  contentHash: text("content_hash").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dealMessages = pgTable("deal_messages", {
  id: text("id").primaryKey(),
  escrowId: text("escrow_id").references(() => escrows.id).notNull(),
  senderAddress: text("sender_address").references(() => users.address).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const verificationAttempts = pgTable("verification_attempts", {
  id: text("id").primaryKey(),
  verificationId: text("verification_id").references(() => verifications.id),
  listingId: text("listing_id").references(() => listings.id),
  ownerAddress: text("owner_address").references(() => users.address).notNull(),
  method: text("method").notNull(),
  target: text("target").notNull(),
  status: text("status").notNull(),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
