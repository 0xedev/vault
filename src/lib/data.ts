export const COLLECTIONS = [
  "Meridian Genesis", "Aperture", "Hollow Forms", "Cipher Drones",
  "Solene Mirrors", "Halo Pass", "Strata Index", "Veil Quartet",
] as const;

export interface Loan {
  id: string;
  coll: number;
  token: string;
  amt: number;
  apr: number;
  term: number;
  ltv: number;
  status: "open" | "funded" | "warn" | "default";
  bid: number;
  value: number;
  borrower: string;
}

export const LOANS: Loan[] = [
  { id: "L-2841", coll: 0, token: "#1147", amt: 8.4, apr: 14.2, term: 30, ltv: 56, status: "open",   bid: 11, value: 15.0, borrower: "0x9a4f...c12e" },
  { id: "L-2840", coll: 1, token: "#0289", amt: 22.0, apr: 9.8,  term: 60, ltv: 48, status: "funded", bid: 4,  value: 45.8, borrower: "0x12bb...77a1" },
  { id: "L-2839", coll: 2, token: "#3301", amt: 3.2, apr: 18.5, term: 14, ltv: 64, status: "warn",   bid: 7,  value: 5.0,  borrower: "0x33ee...8810" },
  { id: "L-2838", coll: 3, token: "#0042", amt: 12.5, apr: 11.0, term: 45, ltv: 51, status: "open",   bid: 3,  value: 24.5, borrower: "0xb501...ac9d" },
  { id: "L-2837", coll: 4, token: "#2204", amt: 6.0,  apr: 13.4, term: 21, ltv: 60, status: "funded", bid: 2,  value: 10.0, borrower: "0x77a3...ee20" },
  { id: "L-2836", coll: 5, token: "#0014", amt: 40.0, apr: 8.5,  term: 90, ltv: 45, status: "open",   bid: 9,  value: 89.0, borrower: "0xfa12...0011" },
  { id: "L-2835", coll: 6, token: "#0998", amt: 1.8,  apr: 22.0, term: 7,  ltv: 72, status: "default",bid: 0,  value: 2.5,  borrower: "0x55cc...8821" },
  { id: "L-2834", coll: 7, token: "#1772", amt: 16.0, apr: 12.0, term: 30, ltv: 53, status: "funded", bid: 5,  value: 30.2, borrower: "0xcd91...4b0a" },
];

export interface DigitalDeal {
  id: string;
  name: string;
  type: string;
  price: number;
  mrr: number;
  chain: string;
  verified: boolean;
  includes: string[];
}

export const DIGITAL_DEALS: DigitalDeal[] = [
  { id: "D-118", name: "$FED Chain", type: "Full Bundle", price: 184, mrr: 12.4, chain: "Base", verified: true,
    includes: ["Token revenue rights", "Tx-fee receiver", "X account · 48k", "Farcaster FID 8210", "Domain · fed.fi", "Telegram · 11k", "Smart-contract owner"] },
  { id: "D-117", name: "Vellum Mini App", type: "Mini App", price: 42, mrr: 3.1, chain: "Base", verified: true,
    includes: ["Frame v2", "31k DAU", "Domain", "Source code"] },
  { id: "D-116", name: "Halo Pass · Reissue", type: "Token", price: 96, mrr: 0, chain: "Ethereum", verified: false,
    includes: ["Contract ownership", "Treasury wallet 9.2 ETH", "Discord ownership"] },
  { id: "D-115", name: "@nautili (Farcaster)", type: "Social", price: 11, mrr: 0.8, chain: "—", verified: true,
    includes: ["FID 1188", "12k followers", "Channel ownership"] },
];

export interface Escrow {
  id: string;
  kind: string;
  party: string;
  asset: string;
  amount: number;
  asset_type: string;
  deadline: string;
  stage: string;
  action: string;
}

export const ESCROWS: Escrow[] = [
  { id: "E-9931", kind: "NFT Loan",  party: "0x12bb…77a1", asset: "Aperture #0289", amount: 22.0, asset_type: "ETH", deadline: "in 18d", stage: "Active",   action: "Awaiting repayment" },
  { id: "E-9930", kind: "X Account", party: "@nautili",   asset: "X · @nautili", amount: 11.0, asset_type: "ETH", deadline: "in 2d 4h", stage: "Transfer", action: "Confirm transfer" },
  { id: "E-9929", kind: "Mini App",  party: "$FED Chain", asset: "Full bundle", amount: 184.0, asset_type: "ETH", deadline: "in 6d", stage: "Funds locked", action: "Awaiting seller" },
  { id: "E-9928", kind: "NFT Loan",  party: "0x33ee…8810", asset: "Hollow Forms #3301", amount: 3.2, asset_type: "ETH", deadline: "in 6h", stage: "At risk", action: "Liquidation queued" },
  { id: "E-9927", kind: "Mini App",  party: "Vellum",     asset: "Mini App", amount: 42.0, asset_type: "USDC", deadline: "completed", stage: "Released", action: "—" },
  { id: "E-9926", kind: "Farcaster", party: "@degenstar", asset: "FID 8210", amount: 16.0, asset_type: "ETH", deadline: "in 11d", stage: "Active", action: "On schedule" },
];

export interface XAccount {
  id: string;
  handle: string;
  followers: number;
  niche: string;
  price: number;
  age: string;
  engagement: number;
  verified: boolean;
  posts_30d: number;
  growth: string;
}

export const X_ACCOUNTS: XAccount[] = [
  { id: "X-441", handle: "@degenstar",  followers: 124000, niche: "Crypto/Trading", price: 38.0,  age: "7y",  engagement: 4.2, verified: true,  posts_30d: 84, growth: "+ 2.4%" },
  { id: "X-440", handle: "@nautili",    followers: 48200,  niche: "Web3/Builder",   price: 11.0,  age: "4y",  engagement: 6.8, verified: true,  posts_30d: 142, growth: "+ 8.1%" },
  { id: "X-439", handle: "@hollowfm",   followers: 22800,  niche: "Music/NFT",      price: 4.5,   age: "3y",  engagement: 3.1, verified: false, posts_30d: 51,  growth: "+ 0.4%" },
  { id: "X-438", handle: "@aperturelab",followers: 91500,  niche: "AI/Tech",        price: 22.0,  age: "5y",  engagement: 5.4, verified: true,  posts_30d: 96,  growth: "+ 4.0%" },
  { id: "X-437", handle: "@meridian_x", followers: 312000, niche: "Finance",        price: 84.0,  age: "9y",  engagement: 2.8, verified: true,  posts_30d: 38,  growth: "− 0.8%" },
  { id: "X-436", handle: "@solene",     followers: 18400,  niche: "Art/Design",     price: 3.2,   age: "2y",  engagement: 7.9, verified: false, posts_30d: 121, growth: "+ 12.0%" },
  { id: "X-435", handle: "@cipherdrn",  followers: 64000,  niche: "Crypto/News",    price: 14.0,  age: "4y",  engagement: 4.6, verified: true,  posts_30d: 68,  growth: "+ 3.1%" },
  { id: "X-434", handle: "@halopassed", followers: 9200,   niche: "Gaming/NFT",     price: 1.4,   age: "2y",  engagement: 8.2, verified: false, posts_30d: 89,  growth: "+ 15.0%" },
];

export interface FarcasterAccount {
  id: string;
  handle: string;
  fid: number;
  followers: number;
  channel: string;
  price: number;
  casts_30d: number;
  power_badge: boolean;
  verified: boolean;
  rev_30d: number;
}

export const FARCASTER: FarcasterAccount[] = [
  { id: "F-228", handle: "vitalik",   fid: 5650,  followers: 88200, channel: "ethereum",  price: 24.0, casts_30d: 41,  power_badge: true,  verified: true,  rev_30d: 0.42 },
  { id: "F-227", handle: "nautili",   fid: 8210,  followers: 12400, channel: "vault",     price: 6.8,  casts_30d: 102, power_badge: false, verified: true,  rev_30d: 0.18 },
  { id: "F-226", handle: "strataidx", fid: 14420, followers: 5800,  channel: "indices",   price: 2.4,  casts_30d: 67,  power_badge: false, verified: false, rev_30d: 0.04 },
  { id: "F-225", handle: "halofarc",  fid: 9911,  followers: 31200, channel: "halo",      price: 11.0, casts_30d: 88,  power_badge: true,  verified: true,  rev_30d: 0.31 },
  { id: "F-224", handle: "veiled",    fid: 22014, followers: 18900, channel: "veil",      price: 5.2,  casts_30d: 124, power_badge: false, verified: false, rev_30d: 0.09 },
  { id: "F-223", handle: "merid",     fid: 1188,  followers: 4400,  channel: "—",         price: 1.2,  casts_30d: 28,  power_badge: false, verified: false, rev_30d: 0.0 },
];

export interface MiniApp {
  id: string;
  name: string;
  kind: string;
  dau: number;
  mrr: number;
  price: number;
  stack: string[];
  verified: boolean;
  source: boolean;
  age: string;
}

export const MINI_APPS: MiniApp[] = [
  { id: "M-118", name: "Vellum",      kind: "Frame v2",     dau: 31200, mrr: 3.1,   price: 42,  stack: ["React","Base","NeynarKit"], verified: true,  source: true,  age: "8mo" },
  { id: "M-117", name: "$FED Chain",  kind: "Token + App",  dau: 18400, mrr: 12.4,  price: 184, stack: ["Solidity","Base","Frame"], verified: true,  source: true,  age: "1y 4mo" },
  { id: "M-116", name: "Halo Pass",   kind: "NFT contract", dau: 0,     mrr: 0,     price: 96,  stack: ["Solidity","Eth","Vercel"], verified: false, source: true,  age: "2y" },
  { id: "M-115", name: "Strata Index",kind: "Index app",    dau: 4400,  mrr: 1.8,   price: 28,  stack: ["Next","Base","tRPC"],      verified: true,  source: true,  age: "11mo" },
  { id: "M-114", name: "Cipher Bot",  kind: "Telegram bot", dau: 9100,  mrr: 0.9,   price: 8.4, stack: ["Node","Base","Telegram"],  verified: true,  source: true,  age: "6mo" },
  { id: "M-113", name: "Solene Cast", kind: "Frame v2",     dau: 22000, mrr: 2.4,   price: 36,  stack: ["React","Base","Pinata"],   verified: false, source: false, age: "5mo" },
];
