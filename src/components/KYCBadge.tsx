"use client";

type Tier = "none" | "tier-1" | "tier-2";

const TIERS: Record<Tier, { label: string; color: string; desc: string; limit: string }> = {
  none: { label: "Unverified", color: "var(--ink-3)", desc: "Wallet only", limit: "Max 1 ETH / trade" },
  "tier-1": { label: "Tier 1", color: "var(--info)", desc: "Email + social linked", limit: "Max 10 ETH / trade" },
  "tier-2": { label: "Tier 2", color: "var(--gold)", desc: "On-chain reputation > 90d", limit: "Unlimited" },
};

export default function KYCBadge({ tier = "none" }: { tier?: Tier | string }) {
  const t = TIERS[tier as Tier] || TIERS.none;
  return (
    <span
      className="pill"
      title={`${t.desc} · ${t.limit}`}
      style={{
        color: t.color,
        borderColor: `color-mix(in oklab, ${t.color} 30%, transparent)`,
        background: `color-mix(in oklab, ${t.color} 10%, transparent)`,
        cursor: "help",
      }}
    >
      <span className="pdot" style={{ background: t.color }} />
      {t.label}
    </span>
  );
}

export function KYCProgress({ tier = "none", trades = 0, daysOnPlatform = 0 }: { tier?: string; trades?: number; daysOnPlatform?: number }) {
  const nextTier = tier === "none" ? "tier-1" : tier === "tier-1" ? "tier-2" : null;

  if (!nextTier) {
    return (
      <div className="col" style={{ gap: 6 }}>
        <span className="pill gold"><span className="pdot" />Tier 2 — fully verified</span>
        <span className="muted-2" style={{ fontSize: 11 }}>{trades} trades · {daysOnPlatform} days on Vault</span>
      </div>
    );
  }

  const requirements = nextTier === "tier-1"
    ? ["Connect X or Farcaster account", `${trades}/5 trades completed`]
    : ["90+ days on Vault", `${trades}/50 trades completed`, "No active disputes"];

  const isTier1 = nextTier === "tier-1";
  const met = isTier1 ? trades >= 5 : trades >= 50;

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="pill" style={{ color: TIERS[tier as Tier]?.color || "var(--ink-3)" }}>
          <span className="pdot" style={{ background: TIERS[tier as Tier]?.color || "var(--ink-3)" }} />
          {TIERS[tier as Tier]?.label || tier}
        </span>
        <span className="muted-2" style={{ fontSize: 11 }}>→ next: {TIERS[nextTier as Tier]?.label || nextTier}</span>
      </div>
      {requirements.map((r, i) => (
        <div key={i} className="row" style={{ gap: 8 }}>
          <span className="muted-2 mono" style={{ fontSize: 11 }}>{i + 1}.</span>
          <span style={{ fontSize: 12, color: met ? "var(--accent)" : "var(--ink-3)" }}>{r}</span>
          {met && <span style={{ color: "var(--accent)" }}>✓</span>}
        </div>
      ))}
    </div>
  );
}
