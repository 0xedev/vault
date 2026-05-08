export const ADMIN_DISPUTES = [
  { id: "D-2241", filed: "2m ago",  filer: "0x9a4f…c12e", against: "0xfa12…0011", market: "Mini App",   asset: "$FED Chain · Full bundle", frozen: 184.0, currency: "ETH", reason: "Incomplete delivery",  status: "new",        priority: "high",  age_h: 0.03 },
  { id: "D-2240", filed: "1h ago",  filer: "atlas_otc",   against: "venice_v",    market: "OTC",        asset: "USDC ↔ USD",              frozen: 1240,  currency: "USDC",reason: "Payment not received", status: "evidence",   priority: "high",  age_h: 1 },
  { id: "D-2239", filed: "6h ago",  filer: "0x52c1…ab09", against: "0x33ee…8810", market: "NFT Loan",   asset: "Hollow Forms #3301",      frozen: 4.21,  currency: "ETH", reason: "Liquidation contested",status: "review",     priority: "med",   age_h: 6 },
  { id: "D-2238", filed: "1d ago",  filer: "@nautili",    against: "0x9a4f…c12e", market: "X Account",  asset: "@nautili",                frozen: 11.0,  currency: "ETH", reason: "Wrong asset delivered",status: "review",     priority: "med",   age_h: 26 },
  { id: "D-2237", filed: "2d ago",  filer: "lagos_giant", against: "0x771a…d50d", market: "OTC",        asset: "USDC ↔ NGN",              frozen: 480000,currency: "NGN", reason: "Suspected fraud",      status: "review",     priority: "high",  age_h: 50 },
  { id: "D-2236", filed: "3d ago",  filer: "rio_btc",     against: "carlos_ar",   market: "OTC",        asset: "BTC ↔ BRL",               frozen: 0.082, currency: "BTC", reason: "Wrong asset delivered",status: "resolved",   priority: "med",   age_h: 72, outcome: "split"  },
  { id: "D-2235", filed: "4d ago",  filer: "0x12bb…77a1", against: "0x9a4f…c12e", market: "Farcaster",  asset: "FID #8210",               frozen: 6.8,   currency: "ETH", reason: "Non-delivery",         status: "resolved",   priority: "low",   age_h: 96, outcome: "refund" },
];

export const ADMIN_LISTINGS = [
  { id: "L-9981", market: "Mini App", title: "$FED Chain — full takeover", seller: "0xfa12…0011", price: "184 ETH", flagged: 0,  age: "12m ago", status: "pending", risk: 24 },
  { id: "L-9980", market: "X",        title: "@meridian_x — 312k", seller: "0x771a…d50d",  price: "84 ETH",  flagged: 2,  age: "32m ago", status: "pending", risk: 68 },
  { id: "L-9979", market: "Farcaster",title: "FID #5650 — vitalik", seller: "0x9a4f…c12e",  price: "24 ETH",  flagged: 4,  age: "1h ago",  status: "pending", risk: 92 },
  { id: "L-9978", market: "Mini App", title: "Halo Pass — NFT contract", seller: "0x33ee…8810", price: "96 ETH",  flagged: 0,  age: "2h ago",  status: "pending", risk: 18 },
  { id: "L-9977", market: "OTC",      title: "USDC ↔ NGN · 1.8%", seller: "lagos_giant", price: "—", flagged: 1, age: "3h ago", status: "approved", risk: 12 },
  { id: "L-9976", market: "X",        title: "@solene — 18k", seller: "0x52c1…ab09", price: "3.2 ETH", flagged: 0, age: "5h ago", status: "rejected", risk: 8 },
];

export const ADMIN_USERS = [
  { addr: "0x9a4f…c12e", handle: "atlas_otc",   joined: "2y 4m", trades: 4128, kyc: "tier-2", flags: 0, locked: 124.8, status: "active" },
  { addr: "0xfa12…0011", handle: "fedchain",    joined: "1y 2m", trades: 18,   kyc: "tier-2", flags: 1, locked: 184.0, status: "active" },
  { addr: "0x52c1…ab09", handle: "—",           joined: "8m",    trades: 64,   kyc: "tier-1", flags: 0, locked: 22.0,  status: "active" },
  { addr: "0x771a…d50d", handle: "merid_x",     joined: "2y",    trades: 240,  kyc: "tier-2", flags: 3, locked: 84.0,  status: "frozen" },
  { addr: "0x33ee…8810", handle: "—",           joined: "1y 8m", trades: 6,    kyc: "none",   flags: 5, locked: 0.0,   status: "banned" },
  { addr: "0x12bb…77a1", handle: "venice_v",    joined: "2m",    trades: 38,   kyc: "tier-1", flags: 2, locked: 0.0,   status: "active" },
  { addr: "0xcd91…4b0a", handle: "kyiv_swap",   joined: "1y",    trades: 1820, kyc: "tier-2", flags: 0, locked: 38.4,  status: "active" },
];

export const ADMIN_TICKETS = [
  { id: "T-7710", from: "atlas_otc",  subj: "Wallet not crediting after release", priority: "urgent", age: "8m ago",  category: "escrow",  unread: true },
  { id: "T-7709", from: "0x9a4f…c12e",subj: "Can't complete KYC tier-2 — passport rejected", priority: "high", age: "42m ago", category: "kyc", unread: true },
  { id: "T-7708", from: "rio_btc",    subj: "How do I challenge a 1-star review?", priority: "low", age: "2h ago", category: "merchant", unread: false },
  { id: "T-7707", from: "lagos_giant",subj: "Bulk export of completed trades for taxes", priority: "med", age: "5h ago", category: "general", unread: false },
  { id: "T-7706", from: "0x771a…d50d",subj: "Account frozen — appeal", priority: "high", age: "1d ago", category: "moderation", unread: false },
];

export const ADMIN_VERIFICATIONS = [
  { id: "V-441", market: "X",        target: "@aperturelab",        owner: "0x9a4f…c12e", method: "OAuth + signed cast", filed: "12m ago", status: "pending" },
  { id: "V-440", market: "Mini App", target: "Vellum (vellum.xyz)", owner: "0x52c1…ab09", method: "DNS TXT + contract owner", filed: "44m ago", status: "pending" },
  { id: "V-439", market: "Farcaster",target: "FID #14420 strataidx",owner: "0xcd91…4b0a", method: "Sign-in with Farcaster", filed: "2h ago",  status: "pending" },
  { id: "V-438", market: "Mini App", target: "Cipher Bot",          owner: "0x12bb…77a1", method: "Bot token + GitHub access", filed: "5h ago", status: "approved" },
];

export const ADMIN_AUDIT = [
  { t: "2m ago",  who: "alice.admin",   action: "FREEZE_ESCROW",       target: "E-9929",   note: "Dispute D-2241 filed — auto-freeze" },
  { t: "14m ago", who: "system",        action: "FUNDS_RELEASED",      target: "E-9927",   note: "Trade completed · 42 USDC released" },
  { t: "32m ago", who: "ben.admin",     action: "USER_BANNED",         target: "0x33ee…8810", note: "5 strikes · multi-account" },
  { t: "1h ago",  who: "alice.admin",   action: "LISTING_REJECTED",    target: "L-9976",   note: "Comparable to known scam (auto-flagged)" },
  { t: "2h ago",  who: "ben.admin",     action: "VERIFICATION_APPROVED", target: "V-438", note: "Cipher Bot · contract owner role confirmed" },
  { t: "3h ago",  who: "system",        action: "DISPUTE_OPENED",      target: "D-2240",   note: "OTC payment dispute · atlas_otc vs venice_v" },
  { t: "5h ago",  who: "alice.admin",   action: "FORCE_RELEASE",       target: "E-9912",   note: "Resolution: refund to buyer" },
  { t: "8h ago",  who: "system",        action: "LIQUIDATION",         target: "0xb2d4…",  note: "Hollow Forms #3301 transferred · default" },
];
