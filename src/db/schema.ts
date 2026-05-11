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
  terms: jsonb("terms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  txHash: text("tx_hash"),
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
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address"),
  amount: real("amount").notNull(),
  currency: text("currency").default("ETH").notNull(),
  txType: text("tx_type").notNull(),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
