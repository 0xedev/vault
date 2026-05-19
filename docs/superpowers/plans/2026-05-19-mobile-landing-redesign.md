# Mobile Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat, muted mobile landing with a premium app-store feel: live stats lead the hero, each of the 4 marketplaces gets a full-width card with its own strong color identity, and redundant sections (featured list, steps, connect strip, tile scroll) are removed.

**Architecture:** Two files change — `page.tsx` (mobile JSX only, desktop untouched) and `globals.css` (mobile CSS additions + two property edits). Tasks alternate between JSX and CSS so each commit is independently buildable.

**Tech Stack:** Next.js 16 app router, React hooks, CSS custom properties, TypeScript

---

### Task 1: Remove old mobile sections + state cleanup

**Files:**
- Modify: `vault/src/app/(user)/page.tsx`

- [ ] **Step 1: Delete the `featured` useMemo**

  Remove lines 128–161 in `page.tsx` (the entire `const featured = useMemo(...)` block). The `topLoan`, `topMiniApp`, `topXAccount`, `topFarcaster` variables on lines 124–127 must stay — they'll be used in the new marketplace cards.

  After deletion the area around line 122 should look like:
  ```tsx
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.amt, 0);
  const totalListings = loans.length + miniApps.length + xAccounts.length + farcaster.length;
  const topLoan = loans[0];
  const topMiniApp = miniApps[0];
  const topXAccount = xAccounts[0];
  const topFarcaster = farcaster[0];

  const primaryAction = role === "seller"
    ? { href: "/market", label: "List asset", sub: "NFT collateral or digital property" }
    : { href: "/market", label: "Browse deals", sub: "Loans, apps, handles, and FIDs" };
  ```

- [ ] **Step 2: Add `activeLoans` derived value**

  Directly after the `totalListings` line add:
  ```tsx
  const activeLoans = loans.filter((l) => l.status === "active").length;
  ```

- [ ] **Step 3: Strip old JSX from the mobile section**

  The mobile section starts at the comment `{/* MOBILE */}` (around line 388). Inside `<div className="show-mobile mobile-home">` make the hero section contain ONLY the existing `.mobile-kicker` div and the existing `.mobile-role-switch` div — delete everything else inside the hero for now (the `<p>`, the `mobile-action-card`, the `mobile-stat-row`). This is a temporary half-state; it will be replaced in Task 2.

  Also delete these sibling sections that follow the hero:
  - The entire `{!isConnected && (<section className="mobile-connect-strip">…</section>)}` block
  - The entire `<section className="mobile-market-strip" …>` block
  - The entire `<section className="mobile-section">…</section>` block (the Featured section)
  - The entire `<section className="mobile-steps">…</section>` block

  The mobile div should now contain only:
  ```tsx
  <div className="show-mobile mobile-home">
    <section className="mobile-hero-panel">
      <div className="mobile-kicker">
        <span className="live-dot" />
        <span>{loading ? "Syncing markets" : "Live escrow market"}</span>
      </div>
      <div className="mobile-role-switch" aria-label="Homepage role">
        <button className={role === "buyer" ? "active" : ""} onClick={() => setRole("buyer")}>Buy / lend</button>
        <button className={role === "seller" ? "active" : ""} onClick={() => setRole("seller")}>Sell / borrow</button>
      </div>
    </section>
  </div>
  ```

- [ ] **Step 4: Verify the build passes**

  ```bash
  cd vault && npm run build
  ```
  Expected: exit 0, no TypeScript errors. The `featured` variable is gone and nothing should reference it.

- [ ] **Step 5: Commit**

  ```bash
  git add vault/src/app/(user)/page.tsx
  git commit -m "refactor: remove old mobile sections and featured useMemo"
  ```

---

### Task 2: New hero section JSX

**Files:**
- Modify: `vault/src/app/(user)/page.tsx`

- [ ] **Step 1: Replace the hero panel content**

  Replace the entire contents of `<section className="mobile-hero-panel">` with:

  ```tsx
  <section className="mobile-hero-panel">
    <div className="mobile-kicker-row">
      <div className="mobile-kicker">
        <span className="live-dot" />
        <span>{loading ? "Syncing markets" : "Live escrow market"}</span>
      </div>
      {!isConnected && (
        <button className="mobile-connect-nudge" onClick={connect} disabled={isConnecting}>
          {isConnecting ? "Connecting…" : "Connect →"}
        </button>
      )}
    </div>

    <div className="mobile-hero-stats">
      <div className="mobile-hero-stat">
        <strong>{totalListings}</strong>
        <span>Listings</span>
      </div>
      <div className="mobile-hero-stat">
        <strong>{fmtETH(totalPrincipal)} Ξ</strong>
        <span>NFT principal</span>
      </div>
      <div className="mobile-hero-stat">
        <strong>{activeLoans}</strong>
        <span>Active loans</span>
      </div>
    </div>

    <h1>Berkshire Hathaway<br />of <em>on-chain</em> assets.</h1>

    <div className="mobile-role-switch" aria-label="Homepage role">
      <button className={role === "buyer" ? "active" : ""} onClick={() => setRole("buyer")}>Buy / lend</button>
      <button className={role === "seller" ? "active" : ""} onClick={() => setRole("seller")}>Sell / borrow</button>
    </div>

    <Link
      href={primaryAction.href}
      className="btn primary"
      style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
    >
      {primaryAction.label} <Icon.arrow />
    </Link>
  </section>
  ```

- [ ] **Step 2: Verify build**

  ```bash
  npm run build
  ```
  Expected: exit 0. `activeLoans` and `totalListings` are referenced; both are defined.

- [ ] **Step 3: Commit**

  ```bash
  git add vault/src/app/(user)/page.tsx
  git commit -m "feat: new mobile hero with stats strip and inline connect nudge"
  ```

---

### Task 3: Hero CSS

**Files:**
- Modify: `vault/src/app/globals.css`

- [ ] **Step 1: Simplify the hero panel background**

  Find `.mobile-hero-panel` (around line 835). Change the `background` property from the two-layer gradient to a flat surface:

  ```css
  .mobile-hero-panel {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--surface);
    padding: 18px;
    box-shadow: var(--shadow-1);
  }
  ```

- [ ] **Step 2: Bump the h1 font-size**

  Find `.mobile-hero-panel h1` (around line 868). Change `font-size: 34px` to `font-size: 38px`. The rule after the change:

  ```css
  .mobile-hero-panel h1 {
    margin: 14px 0 9px;
    font-family: var(--display);
    font-size: 38px;
    line-height: 0.96;
    font-weight: 400;
    letter-spacing: 0;
    text-wrap: balance;
  }
  ```

- [ ] **Step 3: Update `.mobile-home` gap in the media query**

  Find `.mobile-home` inside `@media (max-width: 820px)` (around line 1193). Change `gap: 18px` to `gap: 20px`.

- [ ] **Step 4: Add new hero CSS classes**

  Insert the following block directly after the `.mobile-steps p` rule (around line 1190, just before the `@media (max-width: 820px)` block):

  ```css
  /* ---------- Mobile hero redesign ---------- */
  .mobile-kicker-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 20px;
  }
  .mobile-connect-nudge {
    height: 24px;
    padding: 0 10px;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    font-size: 12px;
    cursor: pointer;
  }
  .mobile-connect-nudge:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .mobile-hero-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    margin-bottom: 20px;
  }
  .mobile-hero-stat {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .mobile-hero-stat + .mobile-hero-stat {
    padding-left: 16px;
    border-left: 1px solid var(--line);
  }
  .mobile-hero-stat strong {
    font-family: var(--mono);
    font-size: 28px;
    font-weight: 500;
    color: var(--ink);
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .mobile-hero-stat span {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-4);
  }
  ```

- [ ] **Step 5: Verify build + lint**

  ```bash
  npm run build && npm run lint
  ```
  Expected: exit 0 on both. Lint may still show the pre-existing 15 warnings — those are fine. Zero new errors.

- [ ] **Step 6: Commit**

  ```bash
  git add vault/src/app/globals.css
  git commit -m "feat: mobile hero CSS — flat panel, 38px h1, stats strip classes"
  ```

---

### Task 4: Marketplace cards JSX

**Files:**
- Modify: `vault/src/app/(user)/page.tsx`

- [ ] **Step 1: Add the marketplace cards wrapper after the hero section**

  Directly after the closing `</section>` of the hero panel (still inside `<div className="show-mobile mobile-home">`), insert:

  ```tsx
  <div className="mobile-market-cards">

    {/* ── NFT Loans ── */}
    <Link href="/market" className="mobile-mkt-card">
      <div className="mobile-mkt-cover" style={{ background: "linear-gradient(135deg, #2C3E8C, #4A6CF7)" }}>
        <div className="mobile-mkt-cover-content">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden" }}><NFTArt seed={4200} /></div>
            <span className="mobile-mkt-name">NFT Loans</span>
          </div>
          <span className="mobile-mkt-count">{loans.length} live</span>
        </div>
      </div>
      {topLoan ? (
        <div className="mobile-mkt-preview">
          <div style={{ width: 36, height: 36, borderRadius: 7, overflow: "hidden", flexShrink: 0 }}><NFTArt seed={topLoan.coll} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{COLLECTIONS[topLoan.coll]} {topLoan.token}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{fmtETH(topLoan.amt)} Ξ · {topLoan.apr}% APR</span>
          </div>
          <span className="mobile-mkt-price">{topLoan.term}d</span>
        </div>
      ) : (
        <div className="mobile-mkt-empty">No NFT loans yet — <strong>be first</strong></div>
      )}
      <div className="mobile-mkt-viewall">View all NFT loans →</div>
    </Link>

    {/* ── Mini Apps ── */}
    <Link href="/miniapps" className="mobile-mkt-card">
      <div className="mobile-mkt-cover" style={{ background: "linear-gradient(135deg, #C2410C, #F97316)" }}>
        <div className="mobile-mkt-cover-content">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--display)", fontSize: 16, color: "#fff" }}>M</div>
            <span className="mobile-mkt-name">Mini Apps</span>
          </div>
          <span className="mobile-mkt-count">{miniApps.length} listed</span>
        </div>
      </div>
      {topMiniApp ? (
        <div className="mobile-mkt-preview">
          <div style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, background: `linear-gradient(135deg, ${appColor(topMiniApp.id, 0)}, ${appColor(topMiniApp.id, 1)})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--display)", fontSize: 16, color: "#fff" }}>{topMiniApp.name.slice(0, 1)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topMiniApp.name}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{fmtCompact(topMiniApp.dau)} DAU · {topMiniApp.mrr} Ξ MRR</span>
          </div>
          <span className="mobile-mkt-price">{topMiniApp.price} Ξ</span>
        </div>
      ) : (
        <div className="mobile-mkt-empty">No mini apps yet — <strong>be first</strong></div>
      )}
      <div className="mobile-mkt-viewall">View all mini apps →</div>
    </Link>

    {/* ── X Accounts ── */}
    <Link href="/x" className="mobile-mkt-card">
      <div className="mobile-mkt-cover" style={{ background: "linear-gradient(135deg, #18181B, #3F3F46)" }}>
        <div className="mobile-mkt-cover-content">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon.xlogo style={{ width: 18, height: 18 }} /></div>
            <span className="mobile-mkt-name">X Accounts</span>
          </div>
          <span className="mobile-mkt-count">{xAccounts.length} handles</span>
        </div>
      </div>
      {topXAccount ? (
        <div className="mobile-mkt-preview">
          <div className="x-avatar" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>
            {topXAccount.imageUrl ? (
              <img src={topXAccount.imageUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : topXAccount.handle.slice(1, 3).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topXAccount.handle}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{fmtCompact(topXAccount.followers)} followers</span>
          </div>
          <span className="mobile-mkt-price">{topXAccount.price} Ξ</span>
        </div>
      ) : (
        <div className="mobile-mkt-empty">No X accounts yet — <strong>be first</strong></div>
      )}
      <div className="mobile-mkt-viewall">View all X accounts →</div>
    </Link>

    {/* ── Farcaster ── */}
    <Link href="/farcaster" className="mobile-mkt-card">
      <div className="mobile-mkt-cover" style={{ background: "linear-gradient(135deg, #6D28D9, #A67EE5)" }}>
        <div className="mobile-mkt-cover-content">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon.cast style={{ width: 18, height: 18 }} /></div>
            <span className="mobile-mkt-name">Farcaster</span>
          </div>
          <span className="mobile-mkt-count">{farcaster.length} FIDs</span>
        </div>
      </div>
      {topFarcaster ? (
        <div className="mobile-mkt-preview">
          <div className="x-avatar" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0, background: "linear-gradient(135deg, #6D28D9, #A67EE5)", color: "#fff" }}>
            {topFarcaster.imageUrl ? (
              <img src={topFarcaster.imageUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : topFarcaster.handle.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              @{topFarcaster.handle} <span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>#{topFarcaster.fid}</span>
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{fmtCompact(topFarcaster.followers)} followers</span>
          </div>
          <span className="mobile-mkt-price">{topFarcaster.price} Ξ</span>
        </div>
      ) : (
        <div className="mobile-mkt-empty">No FIDs listed yet — <strong>be first</strong></div>
      )}
      <div className="mobile-mkt-viewall">View all Farcaster FIDs →</div>
    </Link>

  </div>
  ```

- [ ] **Step 2: Verify build**

  ```bash
  npm run build
  ```
  Expected: exit 0. All four marketplace data variables (`topLoan`, `topMiniApp`, `topXAccount`, `topFarcaster`) are defined at lines 124–127 from Task 1.

- [ ] **Step 3: Commit**

  ```bash
  git add vault/src/app/(user)/page.tsx
  git commit -m "feat: mobile marketplace stacked cards JSX"
  ```

---

### Task 5: Marketplace cards CSS

**Files:**
- Modify: `vault/src/app/globals.css`

- [ ] **Step 1: Add marketplace card CSS**

  Directly after the hero CSS block added in Task 3 Step 4 (the `.mobile-hero-stat span` rule), insert:

  ```css
  /* ---------- Mobile marketplace stacked cards ---------- */
  .mobile-market-cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .mobile-mkt-card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: var(--shadow-1);
    color: inherit;
    text-decoration: none;
  }
  .mobile-mkt-cover {
    position: relative;
    height: 110px;
  }
  .mobile-mkt-cover-content {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 12px 14px;
  }
  .mobile-mkt-name {
    font-size: 17px;
    font-weight: 600;
    color: #fff;
    letter-spacing: -0.01em;
  }
  .mobile-mkt-count {
    font-family: var(--mono);
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    white-space: nowrap;
  }
  .mobile-mkt-preview {
    display: grid;
    grid-template-columns: 36px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    background: var(--card-bg);
    border-top: 1px solid var(--line);
  }
  .mobile-mkt-price {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-2);
    white-space: nowrap;
  }
  .mobile-mkt-empty {
    padding: 14px;
    font-size: 13px;
    color: var(--ink-3);
    background: var(--card-bg);
    border-top: 1px solid var(--line);
  }
  .mobile-mkt-empty strong {
    color: var(--ink);
  }
  .mobile-mkt-viewall {
    padding: 9px 14px;
    font-size: 12px;
    color: var(--accent);
    background: var(--card-bg);
    border-top: 1px solid var(--line);
  }
  ```

- [ ] **Step 2: Final build + lint**

  ```bash
  npm run build && npm run lint
  ```
  Expected: both exit 0. Zero new lint errors above the pre-existing 15 warnings.

- [ ] **Step 3: Commit**

  ```bash
  git add vault/src/app/globals.css
  git commit -m "feat: mobile marketplace card CSS — cover bands, preview rows, per-category colors"
  ```

---

### Task 6: Visual verification + final commit

**Files:** none (read-only verification)

- [ ] **Step 1: Start the dev server if not already running**

  ```bash
  npm run dev
  ```
  Expected: server starts on `http://localhost:3000`

- [ ] **Step 2: Open the mobile view**

  In your browser open `http://localhost:3000`, then set the viewport to ≤820px (Chrome DevTools → Toggle device toolbar, choose any phone preset). Verify:

  - Hero shows kicker pill top-left + "Connect →" pill top-right (when wallet disconnected)
  - Three large mono numbers below the kicker: Listings / NFT principal / Active loans
  - Headline is `Berkshire Hathaway / of on-chain assets.` at ~38px serif, with italic accent on "on-chain"
  - Role switcher and full-width CTA button below headline
  - Four full-width stacked cards below hero, each with a distinct color cover band:
    - Indigo/blue — NFT Loans
    - Orange/amber — Mini Apps
    - Near-black charcoal — X Accounts
    - Purple/violet — Farcaster
  - Each card shows a preview row (or "be first" empty state) and a "View all →" accent link
  - Bottom nav still present and functional
  - Desktop view (>820px) is completely unchanged

- [ ] **Step 3: Push branch**

  ```bash
  git push
  ```
  Expected: branch `codex/production-live-admin` updates on origin with all 5 new commits.
