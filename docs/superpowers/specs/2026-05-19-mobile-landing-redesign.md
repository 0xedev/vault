# Mobile Landing Page Redesign — App Store Editorial

**Date:** 2026-05-19
**Approach:** Option A — App Store Editorial
**Scope:** `vault/src/app/(user)/page.tsx` (mobile section only) + `vault/src/app/globals.css` (mobile CSS only)

---

## Goal

Replace the flat, muted mobile landing page with a "premium app store" experience: live stats lead the page, each marketplace has a strong distinct color identity, and full-width stacked cards replace the horizontal scroll tiles.

---

## Page Structure

### 1. Hero Section (`.mobile-hero-panel`)

**Layout (top to bottom):**

1. **Kicker row** — inline-flex row, full width:
   - Left: live-dot pill (`● LIVE ESCROW MARKET` / `● Syncing markets`)
   - Right: connect nudge — only shown when wallet not connected; a small ghost pill button `Connect →` that calls `connect()`; hidden once connected

2. **Stats strip** — 3-column grid, large display numbers:
   - Column 1: `totalListings` with label "Listings"
   - Column 2: `fmtETH(totalPrincipal) Ξ` with label "NFT principal"
   - Column 3: `loans.filter(l => l.status === "active").length` with label "Active loans"
   - Numbers: `font-family: var(--mono)`, `font-size: 32px`, `font-weight: 500`
   - Labels: `font-size: 10px`, uppercase, `var(--ink-4)`

3. **Headline** — display serif, `font-size: 38px`, `line-height: 0.96`:
   ```
   Berkshire Hethaway
   of on-chain assets.
   ```
   No body paragraph below.

4. **Role switcher** — same segmented control as today (Buy / lend | Sell / borrow)

5. **CTA button** — full-width primary button, role-aware label (`Browse deals` or `List asset`), links to `primaryAction.href`

**Removed from hero:** the `<p>` description text, the `mobile-action-card` with "Next action" label, the `mobile-stat-row` (replaced by the stats strip above), the standalone `mobile-connect-strip` section.

**Background:** plain `var(--surface)` or `var(--bg)` — no gradient. Let the marketplace cards below carry the color.

---

### 2. Marketplace Cards (`.mobile-market-cards`)

Four full-width stacked cards, one per marketplace, in this order: NFT Loans → Mini Apps → X Accounts → Farcaster.

**Each card structure:**

```
┌─────────────────────────────────────────────┐
│ [cover band — 110px tall, colored gradient] │
│  icon (32px)  Name             N live/listed│ ← overlaid on cover band, bottom-aligned
└────────────────────────────────── ──────────┘
│ [top listing preview row — 1 item]          │
│ View all →                                  │
└─────────────────────────────────────────────┘
```

**Cover band colors (CSS custom properties added to globals.css):**

| Marketplace | Gradient |
|---|---|
| NFT Loans | `linear-gradient(135deg, #2C3E8C, #4A6CF7)` — indigo/blue |
| Mini Apps | `linear-gradient(135deg, #C2410C, #F97316)` — orange/amber |
| X Accounts | `linear-gradient(135deg, #18181B, #3F3F46)` — near-black charcoal |
| Farcaster | `linear-gradient(135deg, #6D28D9, #A67EE5)` — purple/violet |

**Cover band overlay:** icon + name + count sit at bottom-left of the cover band using `position: absolute; bottom: 12px; left: 14px`. Count sits at `bottom: 12px; right: 14px`. Text is white (`#fff`). Name is `font-size: 17px; font-weight: 600`. Count is `font-size: 12px; opacity: 0.8; font-family: var(--mono)`.

**Top listing preview:** a single row below the cover band showing the top item for that marketplace. If no data, show an empty-state CTA (`List first [type] →`). Row height ~52px with 12px horizontal padding. This replaces the separate "Featured" section.

| Marketplace | Preview content |
|---|---|
| NFT Loans | `<NFTArt seed>` thumbnail (32px) + `COLLECTIONS[l.coll] token` + `fmtETH(l.amt) Ξ · l.apr% APR` + `l.term d` right-aligned |
| Mini Apps | gradient initial (32px) + `a.name` + `fmtCompact(a.dau) DAU · a.mrr Ξ MRR` + `a.price Ξ` |
| X Accounts | avatar initials (32px) + `a.handle` + `fmtCompact(a.followers) followers` + `a.price Ξ` |
| Farcaster | purple avatar (32px) + `@a.handle #a.fid` + `fmtCompact(a.followers) followers` + `a.price Ξ` |

**"View all" link:** `font-size: 12px`, `color: var(--accent)`, sits below the preview row with `padding: 8px 14px`.

**Card border/shadow:** `border: 1px solid var(--line)`, `border-radius: 18px`, `overflow: hidden`, `box-shadow: var(--shadow-1)`.

**If marketplace data is empty:** cover band is shown but preview row is replaced by a small CTA row: `"No [type] listed yet." + primary sm button`.

---

### 3. Removed Sections

- `mobile-connect-strip` — connect nudge moves inline to hero kicker row
- `mobile-market-strip` (horizontal scroll tiles) — replaced by stacked cards
- `mobile-section` / `mobile-feature-list` — Featured section removed; each card previews its own top item
- `mobile-steps` — How it works explainer removed; page is shorter and more focused

---

## CSS Changes

**New classes to add to globals.css (inside the `@media (max-width: 820px)` block or as mobile-only):**

- `.mobile-hero-stats` — 3-col grid, large mono numbers
- `.mobile-hero-stat` — flex-col, gap 2px, individual stat cell
- `.mobile-hero-stat strong` — 32px mono number
- `.mobile-hero-stat span` — 10px uppercase label
- `.mobile-kicker-row` — flex row, justify-content: space-between, align-items: center
- `.mobile-connect-nudge` — small ghost pill, `font-size: 12px`, `padding: 4px 10px`, only visible when `!isConnected`
- `.mobile-market-cards` — flex-col, gap 16px
- `.mobile-market-card-new` — rounded card, overflow hidden, border, shadow (rename to avoid clash with old `.mobile-market-card`)
- `.mobile-card-cover` — 110px tall, position relative, gradient background
- `.mobile-card-cover-content` — absolute, bottom/left/right, flex row, align-items: flex-end, justify-content: space-between
- `.mobile-card-preview` — single row, grid `40px 1fr auto`, align-items center, padding 10px 14px, border-top 1px solid var(--line)
- `.mobile-card-viewall` — small accent link row

**Modified classes:**
- `.mobile-hero-panel` — remove background gradient, simplify to flat surface with border
- `.mobile-hero-panel h1` — increase to 38px
- `.mobile-home` — gap increases from 18px to 20px

**Deleted classes (no longer rendered):**
- `.mobile-connect-strip` — kept in CSS for safety but the JSX element is removed
- `.mobile-market-strip`, `.mobile-market-card`, `.mobile-market-icon` — old tiles, remove from JSX
- `.mobile-section`, `.mobile-section-head`, `.mobile-feature-list`, `.mobile-feature-row` etc — Featured section removed from JSX
- `.mobile-steps` — removed from JSX

---

## Data / Logic Changes

- `featured` useMemo can be deleted (no longer rendered)
- `primaryAction` stays (used for CTA button)
- Add `activeLoans` derived value: `loans.filter(l => l.status === "active").length` for the stats strip
- No new data fetching needed

---

## What Does NOT Change

- All 4 `fetch` calls in `useEffect`
- `useRole`, `useWallet` hooks
- `DashboardPreview`, `Sparkline` components (desktop only)
- Desktop (`hide-mobile`) section — untouched
- `AppShell`, `TopBar`, `SideBar`, bottom nav
- Footer
- All admin pages
