import type {
  AdminStat,
  AuditEvent,
  Deal,
  Listing,
  MessageThread,
  PrototypeModal,
  PrototypeScreen,
} from "./prototype-types";

export const userScreens: Array<{ label: string; screen: PrototypeScreen }> = [
  { label: "Home", screen: "home" },
  { label: "Market", screen: "market" },
  { label: "Deals", screen: "deals" },
  { label: "Messages", screen: "messages" },
  { label: "Info", screen: "info" },
];

export const marketScreens: Array<{ label: string; screen: PrototypeScreen }> = [
  { label: "Mini Apps", screen: "miniapps" },
  { label: "X", screen: "x" },
  { label: "Farcaster", screen: "farcaster" },
  { label: "Clanker", screen: "clanker" },
];

export const adminScreens: Array<{ label: string; screen: PrototypeScreen }> = [
  { label: "Dashboard", screen: "admin-dash" },
  { label: "Disputes", screen: "admin-disputes" },
  { label: "Listings", screen: "admin-listings" },
  { label: "Users", screen: "admin-users" },
  { label: "Escrow", screen: "admin-escrow" },
  { label: "Tickets", screen: "admin-tickets" },
  { label: "Audit", screen: "admin-audit" },
  { label: "Verify", screen: "admin-verifications" },
];

export const modalLabels: Record<PrototypeModal, string> = {
  "admin-resolve": "Resolve dispute",
  agreement: "Escrow agreement",
  "connect-wallet": "Connect wallet",
  "counteroffer": "Counter offer",
  "empty-state": "Empty state",
  "error-state": "Error state",
  "list-bundle": "List bundle",
  "list-clanker": "List Clanker",
  "list-farcaster": "List Farcaster FID",
  "list-miniapp": "List Mini App",
  "list-nft": "List NFT",
  "list-x": "List X account",
  "listing-message": "Message listing",
  "listing-success": "Listing success",
  "loading-state": "Loading state",
  none: "No modal",
  "share-listing": "Share listing",
};

export const listings: Listing[] = [
  {
    chain: "Base",
    collection: "Terminal Studio",
    kind: "NFT",
    liquidity: "41 saves",
    price: "38.4 ETH",
    risk: "low",
    seller: "0x72b1...9E4a",
    status: "Live",
    title: "Terminal Studio Pass 001",
    verification: "Ownership verified 8 min ago",
  },
  {
    chain: "Base",
    collection: "CreatorOS",
    kind: "Mini App",
    liquidity: "18 bids",
    price: "125,000 USDC",
    risk: "medium",
    seller: "0xa16b...e910",
    status: "Escrow ready",
    title: "CreatorOS Mini App",
    verification: "Revenue evidence checked",
  },
  {
    chain: "Base",
    collection: "Social handles",
    kind: "X Account",
    liquidity: "9 watchers",
    price: "92,000 USDC",
    risk: "medium",
    seller: "0x04F2...7C11",
    status: "Reserved",
    title: "@basefounders",
    verification: "Account proof pending buyer review",
  },
  {
    chain: "Base",
    collection: "Farcaster FIDs",
    kind: "Farcaster",
    liquidity: "31 watchers",
    price: "54.8 ETH",
    risk: "low",
    seller: "0x91A0...31bb",
    status: "Live",
    title: "FID 8242 with 68k followers",
    verification: "Custody proof signed",
  },
  {
    chain: "Base",
    collection: "Clanker launches",
    kind: "Clanker",
    liquidity: "12 bids",
    price: "210,000 USDC",
    risk: "high",
    seller: "0xE08c...14d9",
    status: "In review",
    title: "CLNK creator allocation",
    verification: "Token authority under review",
  },
  {
    chain: "Base",
    collection: "Premium bundle",
    kind: "Bundle",
    liquidity: "6 active bids",
    price: "310,000 USDC",
    risk: "medium",
    seller: "0x7b42...A310",
    status: "Escrow ready",
    title: "Builder media bundle",
    verification: "NFT, account, and app proofs linked",
  },
];

export const deals: Deal[] = [
  {
    asset: "Terminal Studio Pass 001",
    counterparty: "Vault buyer 0x19E4",
    nextStep: "Buyer funds escrow",
    price: "38.4 ETH",
    rail: ["Terms", "Fund", "Transfer", "Release"],
    status: "Waiting",
    updated: "12 min ago",
  },
  {
    asset: "CreatorOS Mini App",
    counterparty: "Seller 0xa16b",
    nextStep: "Admin verifies revenue packet",
    price: "125,000 USDC",
    rail: ["Terms", "Verify", "Transfer", "Release"],
    status: "Funded",
    updated: "1 hr ago",
  },
  {
    asset: "@basefounders",
    counterparty: "Buyer 0x27D0",
    nextStep: "Resolve account recovery evidence",
    price: "92,000 USDC",
    rail: ["Terms", "Fund", "Dispute", "Resolve"],
    status: "Disputed",
    updated: "3 hrs ago",
  },
  {
    asset: "FID 8242",
    counterparty: "Seller 0x91A0",
    nextStep: "Complete release receipt",
    price: "54.8 ETH",
    rail: ["Terms", "Fund", "Transfer", "Release"],
    status: "Released",
    updated: "Yesterday",
  },
];

export const messages: MessageThread[] = [
  {
    asset: "Terminal Studio Pass 001",
    lastMessage: "I can fund escrow after the ownership proof is pinned.",
    participant: "Vault buyer 0x19E4",
    status: "Waiting",
    time: "09:42",
    unread: 2,
  },
  {
    asset: "CreatorOS Mini App",
    lastMessage: "Revenue screenshots match the submitted domain.",
    participant: "Admin review",
    status: "Funded",
    time: "08:10",
    unread: 0,
  },
  {
    asset: "@basefounders",
    lastMessage: "The recovery email changed after the escrow was funded.",
    participant: "Dispute desk",
    status: "Disputed",
    time: "Yesterday",
    unread: 5,
  },
];

export const adminStats: AdminStat[] = [
  { change: "+18% week over week", label: "Protected volume", value: "$4.82M" },
  { change: "11 need review", label: "Listings queued", value: "84" },
  { change: "3 urgent", label: "Open disputes", value: "19" },
  { change: "Median 22 min", label: "Verification SLA", value: "94%" },
];

export const auditEvents: AuditEvent[] = [
  {
    actor: "Admin 0xA91c",
    event: "Approved revenue packet for CreatorOS Mini App",
    time: "10:14",
  },
  {
    actor: "Risk desk",
    event: "Flagged Clanker authority mismatch",
    time: "09:28",
  },
  {
    actor: "Escrow engine",
    event: "Release receipt recorded for FID 8242",
    time: "Yesterday",
  },
];

export const listingWorkflowSteps = [
  "Asset proof",
  "Terms",
  "Verification",
  "Escrow ready",
] as const;
