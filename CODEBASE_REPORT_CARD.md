# Vault Codebase Report Card

Review date: 2026-05-25  
Scope reviewed: Next.js app, API routes, DB schema/migrations, wallet auth, marketplace flows, admin flows, Solidity contract, Foundry tests, docs, env setup.

## Executive Summary

Vault is no longer just a design handoff. The live codebase is a hybrid production prototype: a Next.js 16 app with DB-backed marketplace APIs, SIWE wallet sessions, admin APIs, encrypted-at-rest deal chat, and a substantial Solidity escrow contract with unit, integration, gas, and fuzz tests.

The strongest part of the implementation is the smart contract test coverage and the broad route/API surface. The weakest parts are production hardening and end-to-end consistency between UI, DB records, and on-chain state. Several user-visible flows look complete but still mutate only local React state or off-chain DB state. There are also concrete production blockers: an unauthenticated migration endpoint, a missing `clanker` enum value that breaks Clanker marketplace APIs, missing env variables in `.env.example`, and a default encryption key fallback.

Overall grade: **C+ / 71**

This is a serious build, but it should not be treated as production-ready until the critical issues below are fixed.

## Report Card

| Area | Grade | Status |
|---|---:|---|
| Product coverage | B | Covers NFT loans, mini apps, X accounts, Farcaster, Clanker, deals, admin queues. |
| Frontend UX | B- | Polished app shell and marketplace, but some core deal-room controls are not connected. |
| API/backend | C+ | Good auth helpers and DB-backed routes, but high-risk open migration route and flow gaps. |
| Auth/access control | B- | SIWE sessions and admin guards exist; admin UI itself has no route-level gate. |
| Database model | C+ | Broad schema, but enum drift and no obvious indexing/constraints for production scale. |
| Smart contract | B | Strong core escrow coverage; some design choices and edge cases need tightening. |
| Testing | B- | Next build passes and Foundry local tests pass; no app unit/e2e tests; fork test unstable. |
| Security | C- | Real controls exist, but several production blockers remain. |
| Documentation/config | C | README and AGENTS are partly stale; `.env.example` omits required production variables. |
| Deployment readiness | C | Build passes, but live env/setup and chain sync are incomplete. |

## Verification Results

- `rtk npm run build`: passed. Next generated 39 app routes, including `/clanker`, `/market`, `/deals`, admin pages, and dynamic API routes.
- `rtk npm run lint`: passed with 12 warnings, mostly unused variables and raw `<img>` usage.
- `rtk forge test --offline --no-match-path 'test/fork/*'`: passed 69 tests across 6 suites.
- `rtk forge test`: failed before completion with a Foundry macOS proxy/runtime panic.
- `rtk forge test --offline`: ran local tests but still crashed when the Base fork test executed.

## Critical Issues

### 1. `/api/migrate` runs database migrations through unauthenticated GET

Evidence: `src/app/api/migrate/route.ts:6-32`

The route reads `DATABASE_URL`, loads a local SQL migration file, executes each statement, and returns details. It has no `requireAdmin`, no CSRF guard, and uses GET for a mutating operation. If deployed, anyone who can hit the route can mutate production schema.

Impact: production database integrity risk.

Fix: remove this route from the app or convert it to a CLI/admin-only migration path. Migrations should run in deployment tooling, not public runtime routes.

### 2. Clanker marketplace is wired in UI/API but unsupported by the DB enum

Evidence: `src/app/api/marketplace/[kind]/route.ts:7-13`, `src/db/schema.ts:15-21`

The API maps `clanker` to DB marketplace value `"clanker"`, and homepage/market pages fetch `/api/marketplace/clanker`. The Drizzle enum only allows `nft_loan`, `mini_app`, `x_account`, `farcaster`, and `otc`. Current migrations also do not add `clanker`.

Impact: Clanker reads/writes can fail at the database layer with enum input errors.

Fix: add `clanker` to the Postgres enum via migration and schema, or remove Clanker UI/API until the DB supports it.

### 3. Message encryption silently falls back to a public default secret

Evidence: `src/lib/crypto.ts:7-9`, `.env.example:1-3`

Chat encryption derives the AES key from `MESSAGE_ENCRYPTION_KEY`, but falls back to `"vault-default-key-change-me-in-production"`. `.env.example` does not include `MESSAGE_ENCRYPTION_KEY`, so real deployments can accidentally use a known key.

Impact: encrypted-at-rest messages are decryptable if DB data leaks and the default is used.

Fix: require `MESSAGE_ENCRYPTION_KEY` at startup/runtime for message routes. Add it to `.env.example` and fail closed in production.

### 4. OG preview fetch has partial SSRF protection but follows redirects and reads unbounded HTML

Evidence: `src/app/api/og-preview/route.ts:25-40`, `src/lib/ssrf.ts:29-51`

The code validates the original URL, then calls `fetch(decoded)` with default redirect behavior. A public URL can redirect to private infrastructure after validation. The response body is read with `res.text()` without a content-length/content-type cap.

Impact: SSRF bypass and resource exhaustion risk.

Fix: use `redirect: "manual"`, validate every redirect target, enforce content type, enforce max bytes, and add route-level rate limiting.

### 5. Deal-room release/confirm/dispute UX is not wired to the real action APIs

Evidence: `src/app/(user)/deals/page.tsx:92-124`, `src/app/(user)/deals/page.tsx:192-239`, `src/lib/escrow-actions.ts:35-88`

The deal room has real message APIs, but deliverable confirmation and release controls mostly call local `setStep` / `setActionNotice`. The real endpoints exist under `/api/escrows/[id]/confirm`, `/release`, `/refund`, `/dispute`, and `/proofs`, but the UI does not call them for these buttons.

Impact: users can believe funds or workflow state changed when only local React state changed.

Fix: wire each deal-room control to the matching API and chain transaction helper, then reload escrow state from the server.

## High Priority Issues

### Admin UI is accessible as a shell even when APIs reject the user

Evidence: `src/app/admin/layout.tsx:31-44`, `src/app/admin/dash/page.tsx:36-59`

Admin APIs use `requireAdmin`, which is good. The admin pages themselves still render for everyone and only show API error banners after fetch failure. This is not a data leak if APIs remain correct, but it is poor access control UX and can expose admin navigation/operations surface to non-admins.

Fix: add a client/admin session gate in admin layout or middleware. Redirect non-admin users to sign-in or `/`.

### `.env.example` is incomplete for actual production behavior

Evidence: `.env.example:1-3`, `src/lib/auth.ts:18`, `src/lib/contract.ts:393-396`, `src/lib/crypto.ts:7-9`

The app uses `ADMIN_WALLETS`, `MESSAGE_ENCRYPTION_KEY`, and `NEXT_PUBLIC_ESCROW_CONTRACT`, but `.env.example` only documents `DATABASE_URL`, `NEXT_PUBLIC_URL`, and `NEXT_PUBLIC_ALCHEMY_KEY`.

Fix: document all required and optional variables, including Base RPC/deployment values.

### Digital escrow DB actions are off-chain state changes unless a tx hash is optionally supplied

Evidence: `src/lib/escrow-actions.ts:47-70`, `src/lib/escrow-actions.ts:90-108`

Release/refund/resolve endpoints update DB stage and transaction rows even without verifying a corresponding on-chain transaction. This is acceptable for an off-chain escrow product, but the UI and product copy imply locked funds and contract-backed settlement.

Fix: decide whether these flows are on-chain-first or off-chain-only. If on-chain-first, require tx hash and verify contract event/state before changing DB stage.

### Contract helper ABI includes a `miniApps` read that the contract does not expose

Evidence: `src/lib/contract.ts:209-220`, `contracts/VaultEscrow.sol:645-706`

The contract has `miniAppCount` and a private `_miniAppToDeal` mapping, but no public `miniApps` mapping. Any code that attempts `miniApps(...)` will revert.

Fix: remove this ABI entry or add the matching public getter to the contract.

### `extendDeadline` uses deal creation time, not funding time

Evidence: `contracts/VaultEscrow.sol:543-554`

The comment says the extension is max 14 days from funding, but the code uses `d.createdAt`, which is set when listed. If a listing sits unfunded, the seller may be unable to extend after purchase.

Fix: store `fundedAt` for deals or derive the max deadline from the first funding deadline.

## Medium Priority Issues

### Wallet account changes do not re-authenticate the SIWE session

Evidence: `src/components/WalletProvider.tsx:157-160`

When `accountsChanged` fires, the provider only changes the local address. It does not clear/recreate the server session. The next authenticated API call still uses the session cookie for the old account.

Fix: on account change, call logout and perform SIWE for the new account, or force reconnect.

### CSRF origin check is too loose

Evidence: `src/lib/security.ts:17-24`

The code checks `origin.includes(host)`, which is weaker than comparing parsed origin host/protocol to the request host. It also lets mutations pass if origin is missing but host exists.

Fix: parse `Origin`, compare exact host and protocol policy, and consider rejecting missing origin for browser mutations.

### Rate limiting is in-memory

Evidence: `src/lib/rate-limit.ts:3-24`

This works locally, but it does not hold across serverless instances or deployments.

Fix: use Redis/Upstash/Vercel KV/Edge Config or a DB-backed limiter for production.

### Monetary values use floating-point `real`

Evidence: `src/db/schema.ts:42`, `src/db/schema.ts:100`, `src/db/schema.ts:116`, `src/db/schema.ts:150`

ETH amounts and balances are stored as Postgres `real`, which is not safe for precise currency accounting.

Fix: store wei as text/numeric/bigint, or use `numeric(78,0)` for wei.

### Routes/docs are stale

Evidence: `README.md:20-30`, `AGENTS.md:57-66`, build route output

README lists `/escrow`, `/otc`, and `/portfolio`, but the current build does not include those pages. `AGENTS.md` says `/market` is NFT loans, while the implementation has an all-markets tabbed hub.

Fix: update README and AGENTS to match the actual route map.

## Implementation Strengths

- The app has a real production-ish route structure with user and admin route groups.
- API routes consistently return `DATABASE_URL_REQUIRED` when the DB is missing.
- SIWE nonce persistence exists and nonces are consumed after verification.
- Admin API routes generally use `requireAdmin`.
- User escrow/message routes scope access to buyer/seller/admin.
- Marketplace mappers centralize DB-to-UI normalization.
- Contract uses a reentrancy guard and updates state before ETH transfers in key paths.
- Foundry tests cover unit, integration, gas, and fuzz scenarios.
- Local non-fork contract tests pass cleanly: 69 passing tests.
- Next production build passes.

## Flow-by-Flow Assessment

### Landing and marketplace

Grade: **B**

The marketplace has an all-markets hub, tabs, listing cards, and DB-backed loads. This is a strong user-facing surface. The main gap is category drift: Clanker is exposed but not supported by the DB enum.

### NFT loan listing

Grade: **B-**

The listing modal detects NFTs with Alchemy, asks for a wallet signature, approves the NFT, calls `listNFT`, and posts to `/api/listings`. This is much closer to production than a mock. Gaps: the DB stores the tx hash but not a verified on-chain listing ID; `contractListingId` is optional and not derived from emitted events.

### Offer flow

Grade: **C+**

Offer POST and PATCH routes are authenticated and seller-scoped for accept/reject. The UI has contract helpers for submit/accept/withdraw, but the complete event-to-DB sync path is not yet robust. Offers are also publicly readable by listing ID, which may be intended but should be explicit.

### Deal room

Grade: **C**

Chat is real and participant-scoped. The rest of the deal-room workflow is visually complete but only partially backed by APIs. Release/dispute/proof controls must stop pretending local state is settlement state.

### Admin operations

Grade: **B-**

Admin queues, summary, audit, users, tickets, listings, and verifications are all backed by protected APIs. The weak point is route-level UX guarding and the fact that some admin decisions only update DB state without on-chain event verification.

### Smart contract

Grade: **B**

The contract supports NFT loans, digital asset deals, disputes, refunds, pause, admin transfer, and fee control. Tests are broad for the local contract model. Remaining concerns are mostly product semantics and edge cases: `buyMiniApp` bypasses escrow and pays seller immediately, `extendDeadline` uses listing creation time, and fork testing is not stable in the current environment.

## Recommended Fix Order

1. Remove or protect `/api/migrate`.
2. Add `clanker` to DB enum/migration or remove Clanker routes/UI.
3. Require `MESSAGE_ENCRYPTION_KEY`; update `.env.example`.
4. Wire deal-room buttons to real API/contract actions.
5. Harden `og-preview` redirects, byte limits, and rate limiting.
6. Add admin route guard.
7. Fix wallet account-change re-auth.
8. Replace `real` money columns with precise integer/numeric storage.
9. Fix contract ABI drift and `extendDeadline`.
10. Update README/AGENTS route docs.

## Production Readiness Verdict

Current maturity: **late prototype / early beta**

Do not call this production-ready yet. The implementation has strong bones, especially the contract and API shape, but production readiness depends on closing the security blockers and making UI state, DB state, and on-chain state line up end to end.

