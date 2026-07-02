**Findings**

- **Critical: Farcaster auth can impersonate any wallet.** [auth.ts](/Users/user/Desktop/vault/src/lib/auth.ts:37) lets Farcaster sessions act as any supplied EVM `walletAddress`, and [auth.ts](/Users/user/Desktop/vault/src/lib/auth.ts:193) creates sessions for an unverified `walletAddress` after only validating the FID token. This can escalate to admin if the supplied wallet is an on-chain admin.

- **High: `VaultEscrow` wrapper locks out child-contract admin control.** [VaultEscrow.sol](/Users/user/Desktop/vault/contracts/VaultEscrow.sol:16) deploys `VaultNFT`/`VaultDeals`; [VaultCore.sol](/Users/user/Desktop/vault/contracts/VaultCore.sol:115) makes `msg.sender` admin, so the wrapper becomes admin, not the deployer. The admin UI calls child admin methods directly in [contract-writes.ts](/Users/user/Desktop/vault/src/lib/contract-writes.ts:621), and the fork test failure at [BaseFork.t.sol](/Users/user/Desktop/vault/test/fork/BaseFork.t.sol:21) is legitimate.

- **High: DB schema/migration drift will break deployed flows.** TypeScript includes `bundle` in [schema.ts](/Users/user/Desktop/vault/src/db/schema.ts:15), but migrations only create `marketplace_kind` through `otc` and later add only `clanker` in [0003_add_clanker_marketplace.sql](/Users/user/Desktop/vault/drizzle/0003_add_clanker_marketplace.sql:1). Bundle inserts use `'bundle'` in [route.ts](/Users/user/Desktop/vault/src/app/api/listings/bundle/route.ts:103). Also, sync writes escrow stage `cancelled` in [sync.ts](/Users/user/Desktop/vault/src/lib/sync.ts:243), but `escrow_stage` lacks it in [schema.ts](/Users/user/Desktop/vault/src/db/schema.ts:5). `notification_tokens.verified` is boolean in migration but text in [schema.ts](/Users/user/Desktop/vault/src/db/schema.ts:257).

- **High: API keys appear unusable with the issued secret.** The create route stores `sha256(secret)` in [route.ts](/Users/user/Desktop/vault/src/app/api/me/api-keys/route.ts:40), then verification uses that stored hash as the HMAC key in [api-auth.ts](/Users/user/Desktop/vault/src/lib/api-auth.ts:25). A client signing with the displayed secret will not match unless they know to sign with the hash.

- **Medium: banned/frozen users are not enforced.** Admin updates `users.status` in [route.ts](/Users/user/Desktop/vault/src/app/api/admin/users/route.ts:48), but `getSession` only reads session address and recalculates role in [auth.ts](/Users/user/Desktop/vault/src/lib/auth.ts:226). `requireUser` never checks user status.

- **Medium: offers are publicly queryable with signatures.** [offers/route.ts](/Users/user/Desktop/vault/src/app/api/offers/route.ts:109) has no auth and returns `signature`, `nonce`, and `typedData` in [offers/route.ts](/Users/user/Desktop/vault/src/app/api/offers/route.ts:147) for any `listingId` or `offererAddress`.

- **Medium: public health endpoint leaks operational detail.** [health/route.ts](/Users/user/Desktop/vault/src/app/api/health/route.ts:20) exposes configured/missing secrets and chain/database error text. Better for internal monitoring than public clients.

- **Low: SSRF helper is good but incomplete.** Redirects are manually revalidated in [og-preview/route.ts](/Users/user/Desktop/vault/src/app/api/og-preview/route.ts:72), which is good. The private-IP matcher in [ssrf.ts](/Users/user/Desktop/vault/src/lib/ssrf.ts:9) still misses ranges/forms like most `127.0.0.0/8`, `100.64.0.0/10`, IPv4-mapped IPv6, and only checks one DNS result at [ssrf.ts](/Users/user/Desktop/vault/src/lib/ssrf.ts:50).

- **Low: upload keys include raw filenames.** Public blob uploads use `${file.name}` directly in [upload-image/route.ts](/Users/user/Desktop/vault/src/app/api/upload-image/route.ts:34) and deal image upload in [route.ts](/Users/user/Desktop/vault/src/app/api/deals/[id]/messages/image/route.ts:32). Sanitize or replace with generated extensions.

**Verification**

`npm run lint`, `npm run typecheck`, and `npm run build` passed. `npm test` failed only `AppShell` tests with two 15s timeouts, likely because real Reown/AppKit initialization happens at import time in [reown-appkit.ts](/Users/user/Desktop/vault/src/lib/reown-appkit.ts:36). `forge test` passed 138 tests but failed `test_DeployOnFork`, matching the wrapper admin issue. `npm audit --omit=dev` reports 32 prod vulnerabilities, including one high-severity `ws` chain.

No code changes were made. One tracked file, `cache/test-failures`, was modified by the Foundry test run.

Absolutely. Here’s the fix draft I’d use, ordered by severity and dependency.

**1. Farcaster Wallet Impersonation**
Fix: stop trusting `walletAddress` from `/api/auth/farcaster`.

Change:

- In `src/lib/auth.ts`, create Farcaster sessions as `farcaster:${fid}` only.
- Remove the `actorAddressForRequest()` path that lets a Farcaster session act as any supplied wallet.
- For EVM actions from Farcaster mini-app users, require a real wallet proof:
  - either SIWE sign-in for that wallet, or
  - a new `linked_wallets` table where a Farcaster user links a wallet after signing a message.

Tests:

- Farcaster auth with `walletAddress` should not create an EVM session.
- Farcaster auth with an admin walletAddress should not return role `admin`.
- Listing/offers/escrow actions should reject unlinked wallet overrides.

**2. `VaultEscrow` Admin Lockout**
Fix: decide one deployment model and make code/tests match it.

Best fix:

- Modify `VaultEscrow` to pass an explicit admin into children.
- Update `VaultCore` constructor to accept `_admin`.
- Deploy children with the external deployer/admin, not the wrapper.

Shape:

```solidity
constructor(address _usdc, uint256 _platformFeeBps, address _admin) {
    admins[_admin] = true;
    adminCount = 1;
    treasury = _admin;
    usdc = IERC20(_usdc);
    platformFeeBps = _platformFeeBps;
}
```

Then:

```solidity
constructor(address _usdc, uint256 _platformFeeBps) {
    nft = new VaultNFT(_usdc, _platformFeeBps, msg.sender);
    deals = new VaultDeals(_usdc, _platformFeeBps, msg.sender);
}
```

Alternative:

- Add forwarding admin methods to `VaultEscrow`, but that is clunkier.

Tests:

- Fix `BaseFork.t.sol` so `escrow.nft().admins(admin)` passes.
- Add fork/unit tests for `pause`, `addAdmin`, `setTreasury` via deployed wrapper flow.

**3. DB Schema And Migration Drift**
Fix: add a new migration and align `src/db/schema.ts`.

Migration should add:

- `bundle` to `marketplace_kind`
- `pending_payment`, `paid`, and `cancelled` to `escrow_stage`
- make `notification_tokens.verified` type match the real DB choice

Recommended:

- Keep `verified` as boolean, update Drizzle schema from `text` to `boolean`.

Migration:

```sql
ALTER TYPE "public"."marketplace_kind" ADD VALUE IF NOT EXISTS 'bundle';
ALTER TYPE "public"."escrow_stage" ADD VALUE IF NOT EXISTS 'cancelled';
```

Schema:

- Add `pending_payment`, `paid`, `cancelled` to `escrowStage`.
- Change `verified` to `boolean("verified").default(false).notNull()`.

Tests:

- Add API tests for bundle creation.
- Add sync test for `DealCancelled`.
- Add schema sanity test for enum values used by code.

**4. API Key HMAC Verification**
Fix: either store the raw secret encrypted, or verify using the provided secret before hashing. Since the secret is only shown once, easiest secure model is to store a keyed hash for lookup/rotation and a separate HMAC key is not available. So change the contract:

Recommended:

- Treat the generated `secret` as the HMAC key.
- Store `secret_hash` only for display/audit, but verification cannot derive the secret from it.
- Therefore either:
  - store encrypted secret using `MESSAGE_ENCRYPTION_KEY`, or
  - generate API keys as self-verifying tokens with a server secret.

Simpler robust fix:

- Store `secret_ciphertext`.
- On request, decrypt it and use the real secret for HMAC.
- Keep `secret_hash` for constant-time identifier/audit checks.

Tests:

- Creating an API key and signing with the returned `secret` should authenticate.
- Signing with `sha256(secret)` should fail.
- Expired timestamp and bad passphrase still fail.

**5. Frozen/Banned Users Not Enforced**
Fix: make session lookup join `users` and reject disabled statuses.

Change `getSession()`:

- Query `sessions` joined to `users`.
- If `users.status` is `frozen` or `banned`, return `null` or a 403 from `requireUser`.

Better:

- `banned`: always 403 and delete active sessions.
- `frozen`: allow read-only GET, block mutations.

Also update admin status patch:

- When setting `banned`, delete sessions for that address.

Tests:

- Banned user cannot call protected GET.
- Frozen user can read but cannot POST/PATCH/DELETE.
- Existing sessions stop working after ban.

**6. Public Offers Leak Signatures**
Fix: scope offer reads by authentication.

Change `/api/offers` GET:

- Require auth.
- If querying by `listingId`, allow:
  - listing seller
  - offerer
  - admin
- If querying by `offererAddress`, require that address matches session or admin.
- Do not return `signature`/`typedData` except to the seller accepting the offer or the offerer.

Tests:

- Anonymous GET `/api/offers` returns 401.
- Non-party cannot view offer signatures.
- Seller can view pending offers for their listing.

**7. Public Health Endpoint Leaks Operational Detail**
Fix: split health into public and admin/internal.

Public `/api/health`:

- Return only `{ status, timestamp }`.

New `/api/admin/health` or protected detail mode:

- Require admin.
- Return database, encryption, Alchemy, contract, chain details.

Also:

- Avoid returning raw error messages from DB/RPC to public responses.

Tests:

- Public health does not expose env/config names.
- Admin health includes detailed checks.

**8. SSRF Helper Hardening**
Fix: improve IP classification and DNS handling.

Change:

- Check all DNS results, not just one.
- Block:
  - `127.0.0.0/8`
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
  - `169.254.0.0/16`
  - `100.64.0.0/10`
  - `::1`
  - `fc00::/7`
  - `fe80::/10`
  - IPv4-mapped IPv6 private addresses
- Reject DNS failures instead of letting fetch handle them for server-side proxy endpoints.

Tests:

- Block `127.1`, `127.0.0.2`, IPv6 localhost, metadata IPs, private DNS.
- Allow normal public HTTPS domains.

**9. Blob Upload Filenames**
Fix: never use raw `file.name` in storage keys.

Change:

- Generate UUIDs.
- Derive/sanitize extension from MIME type.
- Keep original filename only as metadata if needed.

Example:

```ts
const ext =
  file.type === "image/png"
    ? "png"
    : file.type === "image/webp"
      ? "webp"
      : "jpg";
const key = `uploads/${crypto.randomUUID()}.${ext}`;
```

For deal images:

```ts
const key = `deals/${escrowId}/${crypto.randomUUID()}.${ext}`;
```

Tests:

- Filename with path separators or weird Unicode does not affect blob key.
- Non-image and oversized uploads still fail.

**Recommended Fix Order**

1. Farcaster auth impersonation
2. Contract admin deployment model
3. DB migration/schema drift
4. API key verification
5. User ban/freeze enforcement
6. Offer privacy
7. Health endpoint split
8. SSRF hardening
9. Blob filename hygiene
