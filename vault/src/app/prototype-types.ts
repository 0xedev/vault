export type PrototypeScreen =
  | "home"
  | "market"
  | "detail"
  | "deals"
  | "messages"
  | "info"
  | "miniapps"
  | "x"
  | "farcaster"
  | "clanker"
  | "history"
  | "admin-dash"
  | "admin-disputes"
  | "admin-listings"
  | "admin-users"
  | "admin-escrow"
  | "admin-tickets"
  | "admin-audit"
  | "admin-verifications";

export type PrototypeModal =
  | "none"
  | "connect-wallet"
  | "list-nft"
  | "list-bundle"
  | "list-miniapp"
  | "list-x"
  | "list-farcaster"
  | "list-clanker"
  | "agreement"
  | "listing-success"
  | "share-listing"
  | "listing-message"
  | "counteroffer"
  | "admin-resolve"
  | "empty-state"
  | "error-state"
  | "loading-state";

export type PrototypeDevice = "auto" | "desktop" | "phone";
export type PrototypeDensity = "calm" | "compact";
export type PrototypeMotion = "full" | "reduced" | "subtle";
export type PrototypeRole = "admin" | "buyer" | "seller";
export type PrototypeTrustLevel = "dispute" | "enhanced" | "standard";
export type PrototypeVisualMode = "boardroom" | "editorial" | "terminal";

export type ListingKind =
  | "Bundle"
  | "Clanker"
  | "Farcaster"
  | "Mini App"
  | "NFT"
  | "X Account";

export type ListingStatus = "Escrow ready" | "In review" | "Live" | "Reserved";
export type DealStatus = "Disputed" | "Funded" | "Released" | "Waiting";
export type RiskLevel = "high" | "low" | "medium";

export type Listing = {
  chain: string;
  collection: string;
  kind: ListingKind;
  liquidity: string;
  price: string;
  risk: RiskLevel;
  seller: string;
  status: ListingStatus;
  title: string;
  verification: string;
};

export type Deal = {
  asset: string;
  counterparty: string;
  nextStep: string;
  price: string;
  rail: readonly string[];
  status: DealStatus;
  updated: string;
};

export type MessageThread = {
  asset: string;
  lastMessage: string;
  participant: string;
  status: DealStatus;
  time: string;
  unread: number;
};

export type AdminStat = {
  change: string;
  label: string;
  value: string;
};

export type AuditEvent = {
  actor: string;
  event: string;
  time: string;
};
