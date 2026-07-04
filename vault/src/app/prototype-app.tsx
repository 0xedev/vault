import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bell,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Gavel,
  History,
  Home,
  Inbox,
  Layers3,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  TicketCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { shouldIncludeToolcraftPreviewBackground } from "@/toolcraft/runtime/export";
import { useToolcraft } from "@/toolcraft/runtime/react";

import {
  adminScreens,
  adminStats,
  auditEvents,
  deals,
  listingWorkflowSteps,
  listings,
  marketScreens,
  messages,
  modalLabels,
  userScreens,
} from "./prototype-data";
import type {
  Deal,
  Listing,
  PrototypeDensity,
  PrototypeDevice,
  PrototypeModal,
  PrototypeMotion,
  PrototypeRole,
  PrototypeScreen,
  PrototypeTrustLevel,
  PrototypeVisualMode,
  RiskLevel,
} from "./prototype-types";
import "./prototype.css";

const allScreens = [...userScreens, ...marketScreens, ...adminScreens];

function isPrototypeScreen(value: unknown): value is PrototypeScreen {
  return typeof value === "string" && allScreens.some((item) => item.screen === value);
}

function isPrototypeModal(value: unknown): value is PrototypeModal {
  return typeof value === "string" && value in modalLabels;
}

function readColor(value: unknown, fallback: string): string {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { hex?: unknown }).hex === "string"
  ) {
    return (value as { hex: string }).hex;
  }

  return fallback;
}

function cx(...classes: Array<false | null | string | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function action(
  onClick: () => void,
  event: React.MouseEvent<HTMLAnchorElement>,
): void {
  event.preventDefault();
  onClick();
}

function BrandMark(): React.JSX.Element {
  return (
    <span className="bh-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <path d="M10 14h28v6H10z" />
        <path d="M10 28h28v6H10z" />
        <path d="M14 10h6v28h-6z" />
        <path d="M28 10h6v28h-6z" />
      </svg>
    </span>
  );
}

function IconLink({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <a href="#" className="bh-icon-link" aria-label={label} onClick={(event) => action(onClick, event)}>
      {children}
    </a>
  );
}

function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "admin" | "danger" | "neutral" | "success" | "warning";
}): React.JSX.Element {
  return (
    <span className={cx("bh-status-badge", `is-${tone}`)} data-prototype-icon="status">
      <span className="bh-status-dot" />
      {label}
    </span>
  );
}

function PageHeader({
  action,
  children,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  children?: React.ReactNode;
  eyebrow: string;
  title: string;
}): React.JSX.Element {
  return (
    <header className="bh-page-header">
      <div>
        <p className="bh-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children ? <p className="bh-page-copy">{children}</p> : null}
      </div>
      {action ? <div className="bh-page-action">{action}</div> : null}
    </header>
  );
}

function AssetGlyph({
  kind,
  risk = "low",
}: {
  kind: Listing["kind"];
  risk?: RiskLevel;
}): React.JSX.Element {
  const riskClass = risk === "high" ? "is-risk" : risk === "medium" ? "is-watch" : "is-clear";
  const rings = kind === "Mini App" || kind === "Bundle" ? 4 : kind === "Clanker" ? 6 : 3;

  return (
    <svg className={cx("bh-asset-glyph", riskClass)} viewBox="0 0 180 120" data-prototype-icon="asset">
      <defs>
        <linearGradient id={`glyph-${kind.replace(/\s+/g, "-")}`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="var(--bh-primary)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--bh-cobalt)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect width="178" height="118" x="1" y="1" rx="14" fill={`url(#glyph-${kind.replace(/\s+/g, "-")})`} />
      <path d="M18 28h144M18 88h144M42 12v96M138 12v96" />
      {Array.from({ length: rings }).map((_, index) => (
        <circle
          cx={54 + (index % 3) * 36}
          cy={44 + Math.floor(index / 3) * 28}
          key={index}
          r={10 + index}
        />
      ))}
      <path className="bh-asset-signal" d="M24 98c20-26 42-26 66 0s46 26 66 0" />
    </svg>
  );
}

function EscrowRailDiagram({
  labels = ["Asset", "Terms", "Escrow", "Release"],
  motionLevel,
}: {
  labels?: readonly string[];
  motionLevel: PrototypeMotion;
}): React.JSX.Element {
  return (
    <div className="bh-rail-diagram" data-motion={motionLevel}>
      <svg viewBox="0 0 720 148" aria-hidden="true">
        <path className="bh-rail-track" d="M64 78h154c30 0 32-36 64-36h156c32 0 34 72 68 72h150" />
        <path className="bh-rail-flow bh-rail-line" d="M64 78h154c30 0 32-36 64-36h156c32 0 34 72 68 72h150" />
        {labels.map((label, index) => {
          const positions = [
            [64, 78],
            [282, 42],
            [438, 42],
            [656, 114],
          ];
          const [cxPos, cyPos] = positions[index] ?? positions[positions.length - 1];

          return (
            <g className="bh-rail-step" key={`${label}-${index}`}>
              <circle cx={cxPos} cy={cyPos} r="24" />
              <text x={cxPos} y={cyPos + 5}>{index + 1}</text>
            </g>
          );
        })}
      </svg>
      <div className="bh-rail-labels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function VaultSignalPlate({ mode }: { mode: PrototypeVisualMode }): React.JSX.Element {
  return (
    <div className={cx("bh-signal-plate", `is-${mode}`)} data-prototype-icon="signal-plate">
      <svg viewBox="0 0 520 360" aria-hidden="true">
        <defs>
          <radialGradient id="vault-signal-glow" cx="50%" cy="45%" r="70%">
            <stop stopColor="var(--bh-fixed)" stopOpacity="0.8" />
            <stop offset="1" stopColor="var(--bh-surface-low)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="520" height="360" rx="28" fill="url(#vault-signal-glow)" />
        <path className="bh-signal-grid" d="M46 54h428M46 112h428M46 170h428M46 228h428M46 286h428M92 34v292M184 34v292M276 34v292M368 34v292" />
        <path className="bh-signal-line" d="M70 258c42-104 76-128 112-72 32 48 70 50 112 6 52-54 88-40 156 44" />
        <path className="bh-signal-line is-secondary" d="M70 204c70-10 110 18 146 42 45 30 91-12 126-60 34-47 72-47 108-10" />
        <circle className="bh-signal-node" cx="184" cy="186" r="26" />
        <circle className="bh-signal-node" cx="342" cy="186" r="18" />
      </svg>
      <div>
        <span>LIVE PROOF MESH</span>
        <strong>Escrow state, custody evidence, and release conditions stay visible.</strong>
      </div>
    </div>
  );
}

function ProofStack({ listing = listings[0] }: { listing?: Listing }): React.JSX.Element {
  return (
    <section className="bh-card bh-proof-stack">
      <div className="bh-section-head">
        <h2>Proof stack</h2>
        <StatusBadge label="Verified" tone="success" />
      </div>
      {["Ownership signature", "Counterparty packet", "Transfer receipt", listing.verification].map((item, index) => (
        <div className="bh-proof-row" key={item}>
          <FileCheck2 size={16} />
          <span>{item}</span>
          <strong>{index === 3 ? "LIVE" : "PASS"}</strong>
        </div>
      ))}
    </section>
  );
}

function RiskMatrix({ risk }: { risk: RiskLevel }): React.JSX.Element {
  const active = risk === "high" ? 3 : risk === "medium" ? 2 : 1;

  return (
    <div className={cx("bh-risk-matrix", `is-${risk}`)} data-prototype-icon="risk">
      {[1, 2, 3].map((item) => (
        <span className={item <= active ? "is-active" : undefined} key={item} />
      ))}
      <strong>{risk} risk</strong>
    </div>
  );
}

function SettlementTimeline({ deal = deals[0], motionLevel }: { deal?: Deal; motionLevel: PrototypeMotion }): React.JSX.Element {
  return (
    <section className="bh-card bh-settlement">
      <div className="bh-section-head">
        <h2>Settlement timeline</h2>
        <StatusBadge label={deal.status} tone={deal.status === "Disputed" ? "danger" : "admin"} />
      </div>
      <EscrowRailDiagram labels={deal.rail} motionLevel={motionLevel} />
      <p>{deal.nextStep}</p>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  tone = "neutral",
  value,
  detail,
}: {
  detail: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  tone?: "admin" | "danger" | "neutral" | "success" | "warning";
  value: string;
}): React.JSX.Element {
  return (
    <motion.article className={cx("bh-card bh-stat-card", `is-${tone}`)} whileHover={{ y: -2 }}>
      <Icon size={17} strokeWidth={2.1} data-prototype-icon="stat" />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </motion.article>
  );
}

function TrustNotice({ level, role }: { level: PrototypeTrustLevel; role: PrototypeRole }): React.JSX.Element {
  const isDispute = level === "dispute";
  const copy = isDispute
    ? "Dispute posture active. Funds stay locked until the review desk records resolution evidence."
    : level === "enhanced"
      ? "Enhanced checks are shown for asset proof, counterparty proof, transfer terms, and release receipts."
      : "Standard escrow checks are active. No wallet or backend logic is connected in this prototype.";

  return (
    <section className={cx("bh-trust-notice", isDispute && "is-dispute")}>
      <div data-prototype-icon="trust">{isDispute ? <Gavel size={18} /> : <ShieldCheck size={18} />}</div>
      <span>
        <strong>{role === "admin" ? "Admin review mode" : "Protected escrow mode"}</strong>
        <p>{copy}</p>
      </span>
    </section>
  );
}

function FilterBar({ active = "All assets", onList }: { active?: string; onList: () => void }): React.JSX.Element {
  return (
    <div className="bh-filter-bar">
      <div className="bh-search">
        <Search size={15} />
        <span>Search assets, accounts, apps, proofs</span>
      </div>
      <div className="bh-filter-pills">
        {["All assets", "NFTs", "Mini Apps", "Accounts", "Tokens"].map((label) => (
          <a href="#" className={cx(label === active && "is-active")} key={label} onClick={(event) => event.preventDefault()}>
            {label}
          </a>
        ))}
      </div>
      <a href="#" className="bh-primary-button" onClick={(event) => action(onList, event)}>
        List asset
      </a>
    </div>
  );
}

function MarketCard({
  icon: Icon,
  label,
  onSelect,
  screen,
  selected,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onSelect: (screen: PrototypeScreen) => void;
  screen: PrototypeScreen;
  selected: boolean;
  value: string;
}): React.JSX.Element {
  return (
    <a href="#" className={cx("bh-market-card", selected && "is-selected")} onClick={(event) => action(() => onSelect(screen), event)}>
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </a>
  );
}

function ListingCard({
  listing,
  onOpen,
  onSelect,
}: {
  listing: Listing;
  onOpen: (modal: PrototypeModal) => void;
  onSelect: () => void;
}): React.JSX.Element {
  const tone =
    listing.risk === "high" ? "danger" : listing.status === "Reserved" ? "warning" : "success";

  return (
    <motion.article className="bh-card bh-listing-card" whileHover={{ y: -2 }}>
      <AssetGlyph kind={listing.kind} risk={listing.risk} />
      <div className="bh-listing-body">
        <div className="bh-card-topline">
          <StatusBadge label={listing.kind} />
          <StatusBadge label={listing.status} tone={tone} />
        </div>
        <a href="#" className="bh-listing-title" onClick={(event) => action(onSelect, event)}>
          {listing.title}
          <ArrowRight size={16} />
        </a>
        <p>{listing.collection}</p>
        <dl className="bh-meta-grid">
          <div><dt>Price</dt><dd>{listing.price}</dd></div>
          <div><dt>Chain</dt><dd>{listing.chain}</dd></div>
          <div><dt>Seller</dt><dd>{listing.seller}</dd></div>
          <div><dt>Interest</dt><dd>{listing.liquidity}</dd></div>
        </dl>
      </div>
      <div className="bh-listing-side">
        <RiskMatrix risk={listing.risk} />
        <span>{listing.verification}</span>
        <a href="#" className="bh-secondary-button" onClick={(event) => action(() => onOpen("agreement"), event)}>
          Terms
        </a>
      </div>
    </motion.article>
  );
}

function DealCard({ deal, onOpen }: { deal: Deal; onOpen: (modal: PrototypeModal) => void }): React.JSX.Element {
  const tone =
    deal.status === "Disputed"
      ? "danger"
      : deal.status === "Released"
        ? "success"
        : deal.status === "Funded"
          ? "admin"
          : "warning";

  return (
    <article className="bh-card bh-deal-card">
      <div>
        <StatusBadge label={deal.status} tone={tone} />
        <h3>{deal.asset}</h3>
        <p>{deal.counterparty}</p>
      </div>
      <div className="bh-deal-rail">
        {deal.rail.map((step) => <span key={step}>{step}</span>)}
      </div>
      <div className="bh-deal-footer">
        <span>{deal.price}</span>
        <strong>{deal.nextStep}</strong>
        <small>{deal.updated}</small>
        <a
          href="#"
          className="bh-secondary-button"
          onClick={(event) => action(() => onOpen(deal.status === "Disputed" ? "admin-resolve" : "listing-message"), event)}
        >
          Review
        </a>
      </div>
    </article>
  );
}

function EmptyState({
  action: actionNode,
  children,
  icon: Icon = Inbox,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number }>;
  title: string;
}): React.JSX.Element {
  return (
    <section className="bh-empty-state">
      <div data-prototype-icon="empty"><Icon size={22} /></div>
      <h3>{title}</h3>
      <p>{children}</p>
      {actionNode}
    </section>
  );
}

function ModalShell({
  children,
  modal,
  onClose,
}: {
  children: React.ReactNode;
  modal: PrototypeModal;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <motion.div
      className="bh-modal-backdrop"
      data-prototype-modal={modal}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        aria-label={modalLabels[modal]}
        className="bh-modal-shell"
        initial={{ opacity: 0, scale: 0.97, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
      >
        <a href="#" className="bh-modal-close" aria-label="Close modal" onClick={(event) => action(onClose, event)}>
          <X size={17} />
        </a>
        {children}
      </motion.section>
    </motion.div>
  );
}

function TransactionFields({ labels }: { labels: readonly string[] }): React.JSX.Element {
  return (
    <div className="bh-field-grid">
      {labels.map((label) => (
        <span key={label}>
          <small>{label}</small>
          <strong>{label.includes("Price") ? "38.4 ETH" : label.includes("Wallet") ? "0x72b1...9E4a" : "Required"}</strong>
        </span>
      ))}
    </div>
  );
}

function PrototypeModalView({ modal, onClose }: { modal: PrototypeModal; onClose: () => void }): React.JSX.Element {
  const title = modalLabels[modal];
  const isState = modal === "empty-state" || modal === "error-state" || modal === "loading-state";
  const primaryCopy =
    modal === "connect-wallet"
      ? "Wallet connection is represented as a placeholder only."
      : modal === "admin-resolve"
        ? "Record dispute outcome, release direction, and review notes as mock operator state."
        : modal === "agreement"
          ? "Review escrow terms, transfer evidence, release conditions, and dispute path."
          : "Create a mock listing workflow with proof requirements and escrow terms.";

  if (isState) {
    return (
      <ModalShell modal={modal} onClose={onClose}>
        <div className="bh-modal-heading">
          <span>STATE / {modal.replace("-state", "").toUpperCase()}</span>
          <h2>{title}</h2>
          <p>{modal === "loading-state" ? "Loading escrow evidence and proof rows." : modal === "error-state" ? "The selected proof packet could not be rendered in this mock state." : "No records match this review state yet."}</p>
        </div>
        {modal === "loading-state" ? <div className="bh-loading-state"><span /><span /><span /></div> : (
          <EmptyState title={title} icon={modal === "error-state" ? AlertTriangle : Inbox}>
            Use this state to test how sparse or broken workflows appear in the redesigned shell.
          </EmptyState>
        )}
      </ModalShell>
    );
  }

  return (
    <ModalShell modal={modal} onClose={onClose}>
      <div className="bh-modal-heading">
        <span>WORKFLOW / STEP 01</span>
        <h2>{title}</h2>
        <p>{primaryCopy}</p>
      </div>
      <section className="bh-modal-panel">
        <h3>{modal === "list-nft" ? "Asset identity" : modal === "connect-wallet" ? "Wallet placeholder" : "Escrow packet"}</h3>
        <TransactionFields labels={modal === "connect-wallet" ? ["Wallet status", "Network", "Session"] : ["Asset identity", "Asking price", "Seller wallet", "Proof packet"]} />
      </section>
      <section className="bh-modal-panel">
        <h3>Proof checklist</h3>
        {["Ownership proof", "Counterparty proof", "Transfer route", "Release condition"].map((item, index) => (
          <div className="bh-proof-row" key={item}>
            {index < 2 ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
            <span>{item}</span>
            <strong>{index < 2 ? "PASS" : "WAIT"}</strong>
          </div>
        ))}
      </section>
      <div className="bh-modal-actions">
        <a href="#" className="bh-secondary-button" onClick={(event) => action(onClose, event)}>Cancel</a>
        <a href="#" className="bh-primary-button" onClick={(event) => action(onClose, event)}>Save mock state</a>
      </div>
    </ModalShell>
  );
}

type ScreenProps = {
  motionLevel: PrototypeMotion;
  onModalChange: (modal: PrototypeModal) => void;
  onScreenChange: (screen: PrototypeScreen) => void;
  role: PrototypeRole;
  screen: PrototypeScreen;
  trustLevel: PrototypeTrustLevel;
  visualMode: PrototypeVisualMode;
};

function PrototypeShell({
  children,
  density,
  modal,
  onModalChange,
  onScreenChange,
  screen,
  visualMode,
}: {
  children: React.ReactNode;
  density: PrototypeDensity;
  modal: PrototypeModal;
  onModalChange: (modal: PrototypeModal) => void;
  onScreenChange: (screen: PrototypeScreen) => void;
  screen: PrototypeScreen;
  visualMode: PrototypeVisualMode;
}): React.JSX.Element {
  const isAdminScreen = screen.startsWith("admin");
  const primaryNav = [...userScreens, ...marketScreens];
  const mobileNav = [
    { icon: Home, label: "Home", screen: "home" as PrototypeScreen },
    { icon: Boxes, label: "Market", screen: "market" as PrototypeScreen },
    { icon: MessageSquare, label: "Deals", screen: "deals" as PrototypeScreen },
    { icon: Bell, label: "Messages", screen: "messages" as PrototypeScreen },
    { icon: LayoutDashboard, label: "Admin", screen: "admin-dash" as PrototypeScreen },
  ];

  const navLink = ({ label, screen: target }: { label: string; screen: PrototypeScreen }) => (
    <a
      href="#"
      className={cx(screen === target && "is-active")}
      key={target}
      onClick={(event) => action(() => onScreenChange(target), event)}
    >
      {label}
    </a>
  );

  return (
    <div className={cx("bh-app-shell", isAdminScreen && "is-admin", density === "compact" && "is-compact", `is-${visualMode}`)}>
      <header className="bh-top-nav">
        <a href="#" className="bh-brand" onClick={(event) => action(() => onScreenChange("home"), event)}>
          <BrandMark />
          <span>
            <strong>Baseshire Hethaway</strong>
            <small>Vault escrow terminal</small>
          </span>
        </a>
        <nav className="bh-desktop-nav" aria-label="Primary navigation">
          {primaryNav.map(navLink)}
          <a href="#" className={cx(isAdminScreen && "is-active")} onClick={(event) => action(() => onScreenChange("admin-dash"), event)}>Admin</a>
        </nav>
        <a href="#" className="bh-wallet-button" onClick={(event) => action(() => onModalChange("connect-wallet"), event)}>
          <WalletCards size={16} />
          Connect Wallet
        </a>
      </header>

      {isAdminScreen ? (
        <nav className="bh-secondary-rail" aria-label="Admin navigation">
          {adminScreens.map(navLink)}
        </nav>
      ) : (
        <nav className="bh-secondary-rail" aria-label="Market navigation">
          {marketScreens.map(navLink)}
        </nav>
      )}

      <main className="bh-page-container">{children}</main>

      <nav className="bh-mobile-dock" aria-label="Mobile navigation">
        {mobileNav.map(({ icon: Icon, label, screen: target }) => (
          <a
            href="#"
            className={cx((screen === target || (target === "admin-dash" && isAdminScreen)) && "is-active")}
            key={target}
            onClick={(event) => action(() => onScreenChange(target), event)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <AnimatePresence>
        {modal !== "none" ? <PrototypeModalView key={modal} modal={modal} onClose={() => onModalChange("none")} /> : null}
      </AnimatePresence>
    </div>
  );
}

function HomeScreen({ motionLevel, onModalChange, onScreenChange, role, trustLevel, visualMode }: ScreenProps): React.JSX.Element {
  return (
    <div className="bh-screen-stack">
      <section className="bh-command-hero">
        <div>
          <PageHeader
            eyebrow="Protected on-chain escrow"
            title="Move high-value assets without trusting a stranger."
            action={<a href="#" className="bh-primary-button" onClick={(event) => action(() => onScreenChange("market"), event)}>Explore market <ArrowRight size={15} /></a>}
          >
            A full redesign playground for premium listings, deal rooms, admin review, and escrow proof states.
          </PageHeader>
          <TrustNotice level={trustLevel} role={role} />
        </div>
        <VaultSignalPlate mode={visualMode} />
      </section>
      <section className="bh-stat-strip">
        <StatCard icon={CircleDollarSign} label="Protected volume" value="$4.82M" detail="Base assets" />
        <StatCard icon={ShieldCheck} label="Verified assets" value="1,284" detail="Proof packets" tone="success" />
        <StatCard icon={Clock3} label="Median release" value="22m" detail="After final receipt" tone="warning" />
        <StatCard icon={Gavel} label="Open disputes" value="19" detail="3 urgent" tone="danger" />
      </section>
      <section className="bh-dashboard-grid">
        <div className="bh-card bh-terminal-panel">
          <div className="bh-section-head">
            <h2>Escrow command rail</h2>
            <StatusBadge label="Mock data only" tone="admin" />
          </div>
          <EscrowRailDiagram motionLevel={motionLevel} />
          <div className="bh-action-stack">
            <a href="#" onClick={(event) => action(() => onModalChange("list-nft"), event)}>List NFT</a>
            <a href="#" onClick={(event) => action(() => onModalChange("agreement"), event)}>Preview agreement</a>
            <a href="#" onClick={(event) => action(() => onScreenChange("admin-dash"), event)}>Open admin view</a>
          </div>
        </div>
        <ProofStack />
      </section>
      <section className="bh-listing-ledger">
        {listings.slice(0, 3).map((listing) => (
          <ListingCard key={listing.title} listing={listing} onOpen={onModalChange} onSelect={() => onScreenChange("detail")} />
        ))}
      </section>
    </div>
  );
}

function MarketScreen({ onModalChange, onScreenChange, screen, trustLevel }: ScreenProps): React.JSX.Element {
  const activeLabel =
    screen === "miniapps" ? "Mini Apps" : screen === "x" || screen === "farcaster" ? "Accounts" : screen === "clanker" ? "Tokens" : "All assets";
  const visibleListings =
    screen === "miniapps" ? listings.filter((item) => item.kind === "Mini App")
      : screen === "x" ? listings.filter((item) => item.kind === "X Account")
        : screen === "farcaster" ? listings.filter((item) => item.kind === "Farcaster")
          : screen === "clanker" ? listings.filter((item) => item.kind === "Clanker")
            : listings;

  return (
    <div className="bh-screen-stack">
      <PageHeader eyebrow="Marketplace" title="Curated assets with escrow-first terms.">
        Every row exposes proof freshness, seller context, price, custody route, and risk before a buyer opens a deal.
      </PageHeader>
      <FilterBar active={activeLabel} onList={() => onModalChange("list-nft")} />
      <div className="bh-market-strip">
        <MarketCard icon={Boxes} label="All markets" screen="market" selected={screen === "market"} value="126" onSelect={onScreenChange} />
        <MarketCard icon={Layers3} label="Mini Apps" screen="miniapps" selected={screen === "miniapps"} value="24" onSelect={onScreenChange} />
        <MarketCard icon={Link2} label="X Accounts" screen="x" selected={screen === "x"} value="31" onSelect={onScreenChange} />
        <MarketCard icon={Users} label="Farcaster" screen="farcaster" selected={screen === "farcaster"} value="44" onSelect={onScreenChange} />
        <MarketCard icon={Banknote} label="Clanker" screen="clanker" selected={screen === "clanker"} value="18" onSelect={onScreenChange} />
      </div>
      {trustLevel === "dispute" ? <TrustNotice level="dispute" role="buyer" /> : null}
      <section className="bh-listing-ledger">
        {visibleListings.map((listing) => (
          <ListingCard key={listing.title} listing={listing} onOpen={onModalChange} onSelect={() => onScreenChange("detail")} />
        ))}
      </section>
    </div>
  );
}

function DetailScreen({ motionLevel, onModalChange }: ScreenProps): React.JSX.Element {
  const listing = listings[0];

  return (
    <div className="bh-screen-stack">
      <PageHeader eyebrow="Listing detail" title={listing.title} action={<StatusBadge label={listing.status} tone="success" />}>
        A high-trust detail page with proof summaries, escrow terms, seller context, and buyer next actions.
      </PageHeader>
      <section className="bh-detail-layout">
        <div className="bh-card bh-detail-hero">
          <AssetGlyph kind={listing.kind} risk={listing.risk} />
          <EscrowRailDiagram labels={listingWorkflowSteps} motionLevel={motionLevel} />
        </div>
        <aside className="bh-card bh-detail-panel">
          <StatusBadge label="Ownership verified" tone="success" />
          <h2>{listing.price}</h2>
          <p>{listing.verification}. Buyer funds are held until transfer proofs and release receipts match.</p>
          <RiskMatrix risk={listing.risk} />
          <a href="#" className="bh-primary-button" onClick={(event) => action(() => onModalChange("agreement"), event)}>Review escrow terms</a>
          <a href="#" className="bh-secondary-button" onClick={(event) => action(() => onModalChange("counteroffer"), event)}>Send counter offer</a>
          <a href="#" className="bh-secondary-button" onClick={(event) => action(() => onModalChange("share-listing"), event)}>Share listing</a>
        </aside>
      </section>
      <section className="bh-dashboard-grid">
        <ProofStack listing={listing} />
        <SettlementTimeline motionLevel={motionLevel} />
      </section>
      <div className="bh-mobile-action-dock">
        <a href="#" className="bh-primary-button" onClick={(event) => action(() => onModalChange("agreement"), event)}>Review escrow terms</a>
      </div>
    </div>
  );
}

function DealsScreen({ motionLevel, onModalChange }: ScreenProps): React.JSX.Element {
  return (
    <div className="bh-screen-stack">
      <PageHeader eyebrow="Deal room" title="Escrow progress that reads at a glance.">
        Each deal exposes next action, proof state, counterparty, and release path without hiding risk.
      </PageHeader>
      <section className="bh-deal-layout">
        <div className="bh-deals-list">
          {deals.map((deal) => <DealCard key={deal.asset} deal={deal} onOpen={onModalChange} />)}
        </div>
        <SettlementTimeline deal={deals[1]} motionLevel={motionLevel} />
      </section>
    </div>
  );
}

function MessagesScreen({ onModalChange }: ScreenProps): React.JSX.Element {
  const active = messages[0];

  return (
    <div className="bh-screen-stack">
      <PageHeader eyebrow="Messages" title="Secure deal conversations.">
        The redesign keeps transaction context and escrow state beside every conversation.
      </PageHeader>
      <section className="bh-messages-layout">
        <div className="bh-card bh-thread-list">
          {messages.map((thread) => (
            <a href="#" key={thread.asset} onClick={(event) => action(() => onModalChange("listing-message"), event)}>
              <span><strong>{thread.participant}</strong><small>{thread.asset}</small></span>
              <StatusBadge label={thread.status} tone={thread.status === "Disputed" ? "danger" : "admin"} />
            </a>
          ))}
        </div>
        <div className="bh-card bh-chat-panel">
          <div className="bh-chat-head">
            <span><h2>{active.asset}</h2><p>{active.lastMessage}</p></span>
            <StatusBadge label={active.status} tone="warning" />
          </div>
          <div className="bh-chat-log">
            <p className="is-them">I can fund escrow after the ownership proof is pinned.</p>
            <p className="is-us">Proof packet is attached. Terms remain unchanged.</p>
            <p className="is-them">Confirmed. I will review the release condition next.</p>
          </div>
          <div className="bh-chat-compose"><span>Message stays attached to deal room</span><Send size={16} /></div>
        </div>
      </section>
    </div>
  );
}

function InfoScreen(): React.JSX.Element {
  const infoCards: Array<{
    copy: string;
    icon: React.ComponentType<{ size?: number }>;
    title: string;
  }> = [
    {
      copy: "Funds and asset transfer evidence remain visible until release conditions are met.",
      icon: ShieldCheck,
      title: "Protected custody",
    },
    {
      copy: "Every high-value listing carries ownership, counterparty, and transfer evidence.",
      icon: LockKeyhole,
      title: "Proof-first workflows",
    },
    {
      copy: "Admin review surfaces risk, recovery, and contradictory evidence without hiding state.",
      icon: Gavel,
      title: "Dispute posture",
    },
    {
      copy: "Operator actions are presented as a clear ledger for post-deal review.",
      icon: History,
      title: "Audit memory",
    },
  ];

  return (
    <div className="bh-screen-stack">
      <PageHeader eyebrow="Trust model" title="Escrow designed for assets where mistakes are expensive.">
        Baseshire Hethaway separates price negotiation, custody transfer, evidence review, and release authority.
      </PageHeader>
      <section className="bh-info-grid">
        {infoCards.map(({ copy, icon: Icon, title }) => {
          return (
            <article className="bh-card bh-info-card" key={title}>
              <Icon size={22} data-prototype-icon="info" />
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function AdminScreen({ onModalChange, onScreenChange, screen }: ScreenProps): React.JSX.Element {
  const titleMap: Partial<Record<PrototypeScreen, string>> = {
    "admin-audit": "Audit log",
    "admin-dash": "Admin command center",
    "admin-disputes": "Dispute queue",
    "admin-escrow": "Escrow operations",
    "admin-listings": "Listing moderation",
    "admin-tickets": "Support inbox",
    "admin-users": "User management",
    "admin-verifications": "Verification desk",
  };

  return (
    <div className="bh-screen-stack">
      <PageHeader eyebrow="Operator console" title={titleMap[screen] ?? "Admin command center"}>
        Risk, verification, disputes, support, and audit actions share the same dense review language.
      </PageHeader>
      <section className="bh-stat-strip">
        {adminStats.map((stat, index) => (
          <StatCard
            detail={stat.change}
            icon={[CircleDollarSign, FileCheck2, Gavel, TicketCheck][index] ?? ShieldCheck}
            key={stat.label}
            label={stat.label}
            tone={index === 2 ? "danger" : index === 3 ? "success" : "admin"}
            value={stat.value}
          />
        ))}
      </section>
      <section className="bh-admin-layout">
        <div className="bh-card bh-admin-table">
          <div className="bh-section-head">
            <h2>Review queue</h2>
            <a href="#" className="bh-secondary-button" onClick={(event) => action(() => onModalChange("admin-resolve"), event)}>Resolve</a>
          </div>
          {listings.slice(1, 5).map((listing) => (
            <div className="bh-table-row" key={listing.title}>
              <span><strong>{listing.title}</strong><small>{listing.verification}</small></span>
              <StatusBadge label={listing.status} tone={listing.risk === "high" ? "danger" : "warning"} />
              <RiskMatrix risk={listing.risk} />
              <a href="#" onClick={(event) => action(() => onScreenChange("detail"), event)}>Open</a>
            </div>
          ))}
        </div>
        <div className="bh-card bh-audit-card">
          <h2>Audit trail</h2>
          {auditEvents.map((event) => (
            <div className="bh-audit-event" key={`${event.actor}-${event.time}`}>
              <span>{event.time}</span>
              <p>{event.event}</p>
              <strong>{event.actor}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HistoryScreen({ onScreenChange }: ScreenProps): React.JSX.Element {
  React.useEffect(() => {
    const timer = window.setTimeout(() => onScreenChange("deals"), 800);
    return () => window.clearTimeout(timer);
  }, [onScreenChange]);

  return (
    <EmptyState title="History redirects to Deals" icon={History}>
      The legacy history route is represented as a redirect state inside this Toolcraft prototype.
    </EmptyState>
  );
}

function ProductScreen(props: ScreenProps): React.JSX.Element {
  if (props.screen === "home") return <HomeScreen {...props} />;
  if (props.screen === "market" || props.screen === "miniapps" || props.screen === "x" || props.screen === "farcaster" || props.screen === "clanker") {
    return <MarketScreen {...props} />;
  }
  if (props.screen === "detail") return <DetailScreen {...props} />;
  if (props.screen === "deals") return <DealsScreen {...props} />;
  if (props.screen === "messages") return <MessagesScreen {...props} />;
  if (props.screen === "info") return <InfoScreen />;
  if (props.screen === "history") return <HistoryScreen {...props} />;
  return <AdminScreen {...props} />;
}

export function PrototypeApp(): React.JSX.Element {
  const { dispatch, state } = useToolcraft();
  const prefersReducedMotion = useReducedMotion();
  const values = state.values;
  const screen = isPrototypeScreen(values["prototype.screen"]) ? values["prototype.screen"] : "home";
  const modal = isPrototypeModal(values["prototype.modal"]) ? values["prototype.modal"] : "none";
  const device = (values["prototype.device"] === "phone" || values["prototype.device"] === "desktop" ? values["prototype.device"] : "auto") as PrototypeDevice;
  const density = values["prototype.density"] === "compact" ? "compact" : "calm";
  const role = (values["prototype.role"] === "seller" || values["prototype.role"] === "admin" ? values["prototype.role"] : "buyer") as PrototypeRole;
  const visualMode = (values["appearance.visualMode"] === "editorial" || values["appearance.visualMode"] === "boardroom" ? values["appearance.visualMode"] : "terminal") as PrototypeVisualMode;
  const motionLevel = (prefersReducedMotion || values["prototype.motion"] === "reduced" ? "reduced" : values["prototype.motion"] === "full" ? "full" : "subtle") as PrototypeMotion;
  const motionPulse = typeof values["motion.pulse"] === "number" && Number.isFinite(values["motion.pulse"]) ? Math.min(100, Math.max(0, values["motion.pulse"])) : 48;
  const trustLevel = (values["prototype.trustLevel"] === "dispute" || values["prototype.trustLevel"] === "standard" ? values["prototype.trustLevel"] : "enhanced") as PrototypeTrustLevel;
  const accent = readColor(values["appearance.accent"], "#002275");
  const background = readColor(values["appearance.background"], "#FAF8FF");
  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });

  const setScreen = React.useCallback((nextScreen: PrototypeScreen) => {
    dispatch({ history: "record", label: `Show ${nextScreen}`, target: "prototype.screen", type: "controls.setValue", value: nextScreen });
  }, [dispatch]);
  const setModal = React.useCallback((nextModal: PrototypeModal) => {
    dispatch({ history: "record", label: `Show ${nextModal}`, target: "prototype.modal", type: "controls.setValue", value: nextModal });
  }, [dispatch]);

  return (
    <div
      className={cx("bh-prototype", device === "phone" && "is-phone", device === "desktop" && "is-desktop")}
      data-prototype-screen={screen}
      data-prototype-modal={modal}
      data-prototype-motion={motionLevel}
      data-toolcraft-product-output
      style={{
        "--bh-accent": accent,
        "--bh-background": includeBackground ? background : "transparent",
        "--bh-rail-duration": `${Math.max(2.2, 5.2 - motionPulse * 0.03).toFixed(2)}s`,
        "--bh-rail-pulse-width": `${Math.round(18 + motionPulse * 0.42)}`,
        "--bh-status-pulse": `${Math.max(1.5, 4.5 - motionPulse * 0.025).toFixed(2)}s`,
      } as React.CSSProperties}
    >
      <PrototypeShell density={density} modal={modal} onModalChange={setModal} onScreenChange={setScreen} screen={screen} visualMode={visualMode}>
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={motionLevel === "reduced" ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={motionLevel === "reduced" ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: motionLevel === "full" ? 0.28 : 0.18, ease: "easeOut" }}
          >
            <ProductScreen
              motionLevel={motionLevel}
              onModalChange={setModal}
              onScreenChange={setScreen}
              role={role}
              screen={screen}
              trustLevel={trustLevel}
              visualMode={visualMode}
            />
          </motion.div>
        </AnimatePresence>
      </PrototypeShell>
    </div>
  );
}
