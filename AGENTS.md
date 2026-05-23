# AGENTS.md

## Project structure

```
src/
  app/
    globals.css          ← Vault design system (CSS custom properties)
    layout.tsx           ← Root HTML + Google Fonts
    (user)/              ← Route group — user-facing pages
      layout.tsx         ← Wraps with AppShell (TopBar + SideBar)
      page.tsx           ← Landing /
      market/page.tsx    ← NFT Loan marketplace /market
      detail/page.tsx    ← Loan detail /detail
      deals/page.tsx     ← Profile /deals (deals list + deal room + chat)
      miniapps/page.tsx  ← Mini Apps /miniapps
      x/page.tsx         ← X Accounts /x
      farcaster/page.tsx ← Farcaster /farcaster
      history/           ← /history → redirects to /deals
    admin/               ← Admin section (red-accented)
      layout.tsx         ← Admin shell (AdminTopBar + AdminSideBar)
      dash/              ← /admin/dash
      disputes/          ← /admin/disputes
      listings/          ← /admin/listings
      users/             ← /admin/users
      admin-escrow/      ← /admin/admin-escrow
      verifications/     ← /admin/verifications
      tickets/           ← /admin/tickets
      audit/             ← /admin/audit
  components/            ← Shared React components
  lib/                   ← Utilities, auth, encryption, security
```

## Commands

```bash
npm run dev     # Start dev server on localhost:3000
npm run build   # Production build
npm run lint    # ESLint
```

## Architecture notes

- **All components are client-side** (`"use client"`) — they use React state/hooks
- **API routes** use Neon serverless Postgres with `@neondatabase/serverless`; set `DATABASE_URL` or endpoints return 503
- **Chat messages** are encrypted at rest (AES-256-GCM) with per-deal key derivation in `src/lib/crypto.ts`
- **CSS custom properties** are the source of truth for theming, toggled via `data-*` attributes on `<body>`
- Fonts load from Google Fonts: Geist (sans), Instrument Serif (display/serif), JetBrains Mono (mono)
- Admin section overrides `--accent` to red (`#FF6B6B`) via the `.admin-app` class
- TopBar + SideBar use `usePathname()` from next/navigation for active state
- Sidebar is responsive: fixed drawer on mobile (≤820px), sticky sidebar on desktop

## Routes

| User pages | Admin pages |
|---|---|
| `/` — Landing | `/admin/dash` — Dashboard |
| `/market` — NFT Loans | `/admin/disputes` — Dispute queue |
| `/detail` — Loan detail | `/admin/listings` — Listing moderation |
| `/deals` — Profile (deals + deal room) | `/admin/users` — User management |
| `/miniapps` — Mini Apps | `/admin/admin-escrow` — Escrow ops |
| `/x` — X Accounts | `/admin/verifications` — Verifications |
| `/farcaster` — Farcaster | `/admin/tickets` — Support inbox |
| `/history` → redirects to `/deals` | `/admin/audit` — Audit log |

Redirects: `/escrow`, `/portfolio`, `/otc` → `/deals`

## Build verification

```bash
# User: /, /market, /detail, /deals, /miniapps, /x, /farcaster, /history
# Admin: /admin/dash, /admin/disputes, /admin/listings, /admin/users, /admin/admin-escrow, /admin/verifications, /admin/tickets, /admin/audit
```
