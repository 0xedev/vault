# Vault — Live App Roadmap

What separates the prototype from a production app.

---

## PHASE 1 — Core App (get it live)

Without these, there is no app.

### 1.1 Wallet Authentication
- WalletConnect / RainbowKit integration use wagmi/viem and farcaster and baseapp connectors {https://miniapps.farcaster.xyz/, https://docs.base.org/apps/quickstart/build-app, wallet connect}
- SIWE (Sign-In with Ethereum)
- Session management
- Profile: wallet address, reputation, KYC tier

### 1.2 Database + API Layer
- Replace hardcoded mock data with a database (Postgres via Neon)
- Next.js API routes for:
  - `POST /api/listings` — create listing
  - `GET /api/listings` — browse with filters
  - `POST /api/offers` — submit offer on a loan/listing
  - `POST /api/escrows` — create escrow
  - `GET /api/escrows/[id]` — escrow state
  - `POST /api/disputes` — file dispute
- Database schema: users, listings, offers, escrows, disputes, transactions

### 1.3 Smart Contract Layer
- Deploy escrow contract (Solidity, audited)
- Multi-sig admin wallet (Eoa first, no multi sig)
- Contract methods:
  - `deposit()` — lock funds in escrow
  - `release()` — release to counterparty
  - `refund()` — return to depositor
  - `dispute()` — freeze funds
  - `resolve(verdict)` — admin-only split/refund/release
- The app reads contract state, writes via user-signed transactions

### 1.4 Real Data Feeds
Replace all mocks with live data:
- NFT metadata + floor prices → Reservoir / OpenSea API / Alchemy
- Token prices → Pyth / Chainlink / CoinGecko
- On-chain events → The Graph / Goldsky subgraph
- X account data → X API (OAuth)
- Farcaster data → Hypersnap (`https://haatz.quilibrium.com`) — open-source node, no API key needed
  - FID profiles, casts, followers
  - Realtime webhooks for FID transfer events
  - Mini-app push notification delivery
  - Self-hostable, no vendor lock-in

---

## PHASE 2 — Trust & Safety

Needed before real money flows.

### 2.1 KYC / Identity
- Tier system: none → tier-1 (email) → tier-2 (ID no ide verifivaton its an decetntraised protocol)
- Integration: Onfido, Persona, or Worldcoin
- KYC gating on high-value escrows

### 2.2 Dispute Resolution Flow
- Evidence upload (IPFS / Arweave)
- Multi-sig admin voting (2-of-3 or 3-of-5)
- On-chain settlement execution
- Timelock on admin actions (24h delay, cancelable)

### 2.3 Rate Limiting + Security
- CSRF protection on all API routes
- Rate limiting on sensitive endpoints
- Input validation (Zod schemas)
- Re-entrancy protection on contracts
- Contract audit (Trail of Bits, OpenZeppelin)

---

## PHASE 3 — Operations

Make it feel real.

### 3.1 Notifications
- Email: offer received, offer accepted, escrow deadline approaching, dispute filed
- In-app: bell icon with notification feed
- Push: web push for mobile PWA

### 3.2 Admin Dashboard (real)
- Connect admin pages to real data (currently mock)
- Admin auth (separate from user auth, multi-sig key)
- Bulk actions actually work
- Audit log is immutable (signed events)

### 3.3 PWA + Mobile
- Service worker, offline support
- Install prompt
- Push notifications

---

## PHASE 4 — Polish

### 4.1 Analytics
- Page views, conversion funnels (Plausible / PostHog)
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)

### 4.2 SEO + OG
- Metadata for all marketplace pages
- OG images for listings
- Sitemap

### 4.3 Legal
- Terms of Service
- Privacy Policy
- Risk disclaimers
- Jurisdiction declaration

---

## WHAT CAN BE DONE NOW (frontend-only)

| Task | Effort | Description |
|---|---|---|
| API route layer | 1 day | Create all Next.js API routes with mock responses |
| Database schema | 1 day | Define Postgres schema, run migrations |
| Wallet Connect UI | 1 day | Add RainbowKit + wagmi, mock contract calls |
| Supabase setup | 2 hours | Project, tables, Row Level Security |
| Zod validation | 2 hours | Input schemas for all API routes |
| Admin auth middleware | 2 hours | Simple API key or session check |

## WHAT NEEDS EXTERNAL WORK

| Task | Dependency |
|---|---|
| Smart contract deployment | Solidity dev + audit firm |
| KYC integration | Onfido/Persona subscription |
| Real data APIs | API keys for Reservoir, Neynar, CoinGecko |
| Legal setup | Lawyer (ToS, privacy, entity formation) |
