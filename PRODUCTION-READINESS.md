# Production Readiness Plan

## Legend
- 🔴 **Critical** — must be done before any production traffic
- 🟡 **High** — should be done before production, major risk mitigation
- 🟢 **Medium** — ship soon after launch
- ⚪ **Low** — nice-to-have, ongoing improvement

---

## Phase 1: Foundation (🔴 Critical — do first)

### 1.1 Environment documentation
- [ ] Create `.env.example` with every required variable and descriptions:
  ```
  DATABASE_URL=          # Neon serverless Postgres connection string
  ADMIN_WALLETS=         # Comma-separated admin wallet addresses
  MESSAGE_ENCRYPTION_KEY=# 32-byte hex key for AES-256-GCM deal encryption
  NEXT_PUBLIC_URL=       # Public URL of the app
  NEXT_PUBLIC_ALCHEMY_KEY=# Alchemy API key (Base + Ethereum)
  NEXT_PUBLIC_ESCROW_CONTRACT=# Deployed escrow contract address
  ```
- [ ] Add a `setup.sh` script that validates all required env vars are set

### 1.2 Error pages (every route segment needs these)
- [ ] Create `src/app/error.tsx` — generic error boundary with retry
- [ ] Create `src/app/global-error.tsx` — root error boundary for layout failures
- [ ] Create `src/app/not-found.tsx` — 404 page
- [ ] Create `src/app/loading.tsx` — root loading skeleton
- [ ] Create `src/app/(user)/error.tsx`
- [ ] Create `src/app/(user)/loading.tsx`
- [ ] Create `src/app/admin/error.tsx`
- [ ] Create `src/app/admin/loading.tsx`
- [ ] Add `React.ErrorBoundary` wrapper in `AppShell.tsx` and admin layout

### 1.3 Middleware for route protection
- [ ] Create `src/middleware.ts`:
  - Redirect unauthenticated users away from `/admin/*` to `/`
  - Check session cookie exists and is valid for admin routes
  - Apply rate limiting at the edge (before API routes)
  - Add security headers: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`

### 1.4 Fix API key exposure
- [ ] Rename `NEXT_PUBLIC_ALCHEMY_KEY` to `ALCHEMY_KEY` (remove `NEXT_PUBLIC_` prefix)
- [ ] Create `GET /api/nfts/[address]` proxy route that calls Alchemy server-side
- [ ] Create `GET /api/nfts/[address]/[tokenId]` for floor price and metadata
- [ ] Update all client components to call API routes instead of using the Alchemy SDK directly

---

## Phase 2: Testing (🔴 Critical — no production without tests)

### 2.1 Test infrastructure
- [ ] Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `msw`
- [ ] Create `vitest.config.ts` with path aliases matching `tsconfig.json`
- [ ] Add `npm run test` and `npm run test:watch` scripts
- [ ] Add `npm run typecheck` script: `tsc --noEmit`

### 2.2 Unit tests (priority order)
- [ ] `src/lib/crypto.ts` — encrypt/decrypt round-trip, key derivation determinism
- [ ] `src/lib/rate-limit.ts` — threshold enforcement, cleanup, IP parsing
- [ ] `src/lib/security.ts` — CSRF origin matching, CORS header generation
- [ ] `src/lib/ssrf.ts` — blocked hostnames, private IP ranges, DNS resolution
- [ ] `src/lib/contract.ts` — `parseContractError()` for all error types
- [ ] `src/lib/utils.ts` — formatting edge cases (zero, negative, huge numbers)
- [ ] `src/lib/api.ts` — `shortAddress()`, `relativeDeadline()`, `stageLabel()`
- [ ] `src/lib/data.ts` — type narrowing helpers
- [ ] `src/lib/escrow-actions.ts` — Zod schema validation (valid/invalid payloads)

### 2.3 Integration tests
- [ ] Auth flow: nonce creation → SIWE signature verification → session cookie → session validation → logout
- [ ] Listing CRUD: create → read → update → delete with auth guards
- [ ] Escrow lifecycle: create → fund → proof → confirm → release
- [ ] Dispute flow: file → admin resolve
- [ ] Rate limiting: exceed threshold → 429, then reset
- [ ] Admin gates: unauthenticated → 401, non-admin → 403

### 2.4 Component tests
- [ ] `WalletProvider` — connect, disconnect, session restore, error states
- [ ] `AdminGate` — loading, unauthorized, authorized states, race condition fix
- [ ] `AppShell` — responsive sidebar drawer, mobile bottom nav active state

---

## Phase 3: CI/CD (🟡 High)

### 3.1 GitHub Actions
- [ ] Create `.github/workflows/ci.yml`:
  ```yaml
  name: CI
  on: [push, pull_request]
  jobs:
    lint:        # npm run lint
    typecheck:   # npm run typecheck
    test:        # npm run test
    build:       # npm run build (catches build errors)
  ```
- [ ] Add required status checks in branch protection rules

### 3.2 Pre-commit hooks (optional)
- [ ] Add `husky` + `lint-staged` to run lint + typecheck on staged files

---

## Phase 4: Observability (🟡 High)

### 4.1 Logging
- [ ] Install `pino` (lightweight, fast JSON logger)
- [ ] Create `src/lib/logger.ts` wrapping pino:
  - Request ID generation and propagation
  - Structured fields: `method`, `path`, `status`, `duration`, `userId`, `error`
  - Redact sensitive fields (cookies, auth headers, message bodies)
- [ ] Add request logging middleware in API helper (`src/lib/api.ts`):
  - Log incoming requests with timing
  - Log all 4xx/5xx responses with error details
- [ ] Log all auth events: login success/failure, session expiry, admin actions
- [ ] Log all escrow state transitions with escrow ID and actor

### 4.2 Error tracking
- [ ] Integrate Sentry or equivalent (optional but recommended)
- [ ] Add `src/lib/instrumentation.ts` for Next.js instrumentation hook

---

## Phase 5: Security hardening (🟡 High)

### 5.1 Session improvements
- [ ] Add session rotation on sensitive operations (escrow release, dispute resolution)
- [ ] Add absolute session timeout (24h max) in addition to 7-day sliding expiry
- [ ] Add device fingerprinting to session (user-agent + IP hash)
- [ ] Auto-expire all sessions for a user on role change (user → admin)

### 5.2 Input hardening
- [ ] Add max request body size limits per route
- [ ] Add content-type validation on all POST/PATCH routes
- [ ] Sanitize user-generated content before storage (XSS prevention)

### 5.3 Secrets
- [ ] Remove `localStorage.setItem("vault-wallet", ...)` — use session cookie only
- [ ] Audit all `NEXT_PUBLIC_*` env vars — move anything sensitive server-side
- [ ] Rotate `MESSAGE_ENCRYPTION_KEY` if it's been committed anywhere

### 5.4 Headers
- [ ] Add Content-Security-Policy header in `next.config.ts` or middleware
- [ ] Verify `secure` flag on cookies in production (already in `auth.ts`, confirm)

---

## Phase 6: Reliability (🟢 Medium)

### 6.1 Replace `setInterval` in rate limiter
- [ ] The `setInterval` in `src/lib/rate-limit.ts:31` leaks in serverless — replace with lazy cleanup on each request (check oldest entry timestamp, clean if stale)

### 6.2 Fix custom ID collision risk
- [ ] Replace `Date.now() + Math.random()` in `src/lib/admin.ts` with `crypto.randomUUID()` or a proper ULID/nanoid

### 6.3 Contract error handling
- [ ] Add retry logic to `src/lib/contract.ts` for transient RPC failures (network errors, rate limits)
- [ ] Add timeout to RPC calls (currently unbounded)

### 6.4 Sync resilience
- [ ] Add per-event error handling in `src/lib/sync.ts` — currently one bad event blocks the entire sync batch
- [ ] Add dead-letter queue or skipped-event tracking for events that fail to parse

### 6.5 Database connection pooling
- [ ] Verify Neon serverless connection limits and add connection pool config if needed
- [ ] Add graceful shutdown on SIGTERM (close DB connections)

---

## Phase 7: DX & Maintainability (⚪ Low)

### 7.1 Docker
- [ ] Create `Dockerfile` (multi-stage: deps → build → production)
- [ ] Create `docker-compose.yml` with app + Postgres for local dev
- [ ] Add `.dockerignore`

### 7.2 Code quality
- [ ] Split `src/lib/contract.ts` (895 lines) into `contract-abi.ts`, `contract-helpers.ts`, `contract-writes.ts`
- [ ] Split `src/lib/escrow-actions.ts` into route handlers (thin) and service layer (business logic)
- [ ] Add `npm run format` with Prettier

### 7.3 Documentation
- [ ] Add `CONTRIBUTING.md`
- [ ] Add API route documentation (OpenAPI spec or simple markdown table)
- [ ] Add architecture decision records (ADRs) for key choices (why SIWE, why AES-256-GCM, why CSS custom properties)

### 7.4 Monitoring
- [ ] Add health check endpoint: `GET /api/health` → checks DB connectivity + contract RPC
- [ ] Add Prometheus metrics endpoint (optional, for future)

---

## Phase 8: Pre-launch checklist (🔴 Critical — deploy gate)

- [ ] Load test critical paths (listing creation, escrow flow) — target 100 req/s minimum
- [ ] Penetration test: attempt SSRF, CSRF bypass, session hijacking, SQL injection
- [ ] Verify all admin routes are inaccessible without admin session (curl test)
- [ ] Verify CORS allows only production domains
- [ ] Verify rate limiting works under load (concurrent requests from same IP)
- [ ] Run Lighthouse audit on all pages (performance, accessibility, SEO)
- [ ] Test on mobile (iOS Safari, Android Chrome) — especially wallet connect flow
- [ ] Test on all supported wallets (MetaMask, WalletConnect, Coinbase Wallet)
- [ ] Verify database backup strategy is in place
- [ ] Verify contract address on Base mainnet (not testnet/sepoli)
- [ ] Verify all env vars are set in production deployment (Vercel dashboard or equivalent)
- [ ] Run `npm run build` with production env vars — ensure zero errors
- [ ] Smoke test after deploy: create listing → make offer → accept → fund escrow → complete

---

## Effort estimate

| Phase | Items | Est. effort |
|-------|-------|-------------|
| Phase 1: Foundation | 3 sections, ~16 items | 2-3 days |
| Phase 2: Testing | 4 sections, ~30+ test files | 5-7 days |
| Phase 3: CI/CD | 1 workflow file | 0.5 day |
| Phase 4: Observability | Logging + error tracking | 1-2 days |
| Phase 5: Security hardening | 4 sections | 2-3 days |
| Phase 6: Reliability | 5 items | 1-2 days |
| Phase 7: DX | 4 sections | 2-3 days |
| Phase 8: Pre-launch | 15 manual checks + load test | 2-3 days |

**Total: ~15-25 days** for a single developer working full-time.
