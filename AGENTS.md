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
      escrow/page.tsx    ← Escrow center /escrow
      deals/page.tsx     ← Deal room /deals
      miniapps/page.tsx  ← Mini Apps /miniapps
      x/page.tsx         ← X Accounts /x
      farcaster/page.tsx ← Farcaster /farcaster
      otc/page.tsx       ← OTC P2P /otc
      portfolio/         ← /portfolio
      history/           ← /history
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
  lib/                   ← Mock data, utilities
```

## Commands

```bash
npm run dev     # Start dev server on localhost:3000
npm run build   # Production build
npm run lint    # ESLint
```

## Architecture notes

- **All components are client-side** (`"use client"`) — they use React state/hooks
- **No API calls** — all data is hardcoded mock data in `src/lib/data.ts` and `src/lib/admin-data.ts`
- **CSS custom properties** are the source of truth for theming, toggled via `data-*` attributes on `<body>`
- Fonts load from Google Fonts: Geist (sans), Instrument Serif (display/serif), JetBrains Mono (mono)
- Admin section overrides `--accent` to red (`#FF6B6B`) via the `.admin-app` class
- TopBar + SideBar use `usePathname()` from next/navigation for active state
- Sidebar is responsive: fixed drawer on mobile (≤820px), sticky sidebar on desktop

## Build verification

```bash
# Build succeeds with 22 static routes:
# User: /, /market, /detail, /escrow, /deals, /miniapps, /x, /farcaster, /otc, /portfolio, /history
# Admin: /admin/dash, /admin/disputes, /admin/listings, /admin/users, /admin/admin-escrow, /admin/verifications, /admin/tickets, /admin/audit
```
