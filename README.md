# Vault

NFT-backed lending & escrow platform — one venue for NFT loans, mini-app sales, X handle transfers, and Farcaster FID escrow.

Built from a [Claude Design](https://claude.ai/design) handoff bundle.

## Quick start

```bash
npm install
cp .env.example .env.local # or set DATABASE_URL in your shell
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Contract deployment

Generate a Base MCP `send_calls` payload for the escrow wrapper:

```bash
mkdir -p deployments
ADMIN=0xYourBaseAccount forge script script/DeployVaultEscrow.s.sol:DeployVaultEscrowScript --sig "writeBaseMcpPayload()"
```

The script writes `deployments/base-mcp-deploy.json` with the CREATE2 call, predicted wrapper address, and child `VaultNFT` / `VaultDeals` addresses. For a normal private-key Foundry deployment, use `forge script script/DeployVaultEscrow.s.sol:DeployVaultEscrowScript --broadcast`.

## Routes

| User pages | Admin pages |
|---|---|
| `/` — Landing | `/admin/dash` — Dashboard |
| `/market` — All markets | `/admin/disputes` — Dispute queue |
| `/detail` — Loan detail | `/admin/listings` — Listing moderation |
| `/deals` — Deal room | `/admin/admin-escrow` — Escrow ops |
| `/miniapps` — Mini Apps | `/admin/verifications` — Verifications |
| `/x` — X Accounts | `/admin/tickets` — Support inbox |
| `/farcaster` — Farcaster | `/admin/audit` — Audit log |
| `/clanker` — Clanker tokens | |
| `/history` — redirects to `/deals` | |

## Stack

- **Next.js 16** (App Router) with TypeScript
- **CSS custom properties** for theming (dark/light, solid/glass, density)
- Google Fonts: Geist, Instrument Serif, JetBrains Mono
- Live Neon/Postgres API routes. `DATABASE_URL` is required; endpoints return an explicit 503 when it is missing.
- Runtime migrations are not exposed as public API routes. Apply Drizzle SQL migrations through deployment tooling.

## Theme system

Toggle via the **⚙ gear button** (bottom-right) or set `data-*` attributes on `<body>`:

| Attribute | Values |
|---|---|
| `data-theme` | `dark`, `light` |
| `data-card` | `solid`, `glass` |
| `data-density` | `compact`, `regular`, `comfortable` |
