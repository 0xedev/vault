# Vault

NFT-backed lending & escrow platform — one venue for NFT loans, mini-app sales, X handle transfers, and Farcaster FID escrow.

Built from a [Claude Design](https://claude.ai/design) handoff bundle.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Routes

| User pages | Admin pages |
|---|---|
| `/` — Landing | `/admin/dash` — Dashboard |
| `/market` — NFT Loans | `/admin/disputes` — Dispute queue |
| `/detail` — Loan detail | `/admin/listings` — Listing moderation |
| `/escrow` — Escrow center | `/admin/users` — User management |
| `/deals` — Deal room | `/admin/admin-escrow` — Escrow ops |
| `/miniapps` — Mini Apps | `/admin/verifications` — Verifications |
| `/x` — X Accounts | `/admin/tickets` — Support inbox |
| `/farcaster` — Farcaster | `/admin/audit` — Audit log |
| `/otc` — OTC P2P | |
| `/portfolio` — Portfolio | |
| `/history` — History | |

## Stack

- **Next.js 16** (App Router) with TypeScript
- **CSS custom properties** for theming (dark/light, solid/glass, density)
- Google Fonts: Geist, Instrument Serif, JetBrains Mono
- Mock data layer — no external API

## Theme system

Toggle via the **⚙ gear button** (bottom-right) or set `data-*` attributes on `<body>`:

| Attribute | Values |
|---|---|
| `data-theme` | `dark`, `light` |
| `data-card` | `solid`, `glass` |
| `data-density` | `compact`, `regular`, `comfortable` |
