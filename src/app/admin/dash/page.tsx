"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/icons";

type Summary = {
  activeEscrows: number;
  totalLocked: number;
  estimatedFees: number;
  activeDisputes: number;
  pendingListings: number;
  openTickets: number;
  pendingVerifications: number;
};

type AuditRow = { id: string; t: string; who: string; action: string; target: string; note: string };
type DisputeRow = { id: string; market: string; filed: string; frozen: number; currency: string; status: string; reason: string };

const emptySummary: Summary = {
  activeEscrows: 0,
  totalLocked: 0,
  estimatedFees: 0,
  activeDisputes: 0,
  pendingListings: 0,
  openTickets: 0,
  pendingVerifications: 0,
};

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/summary").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load summary");
        return json.data;
      }),
      fetch("/api/disputes").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load disputes");
        return json.data || [];
      }),
      fetch("/api/admin/audit").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load audit");
        return json.data || [];
      }),
    ])
      .then(([summaryData, disputeData, auditData]) => {
        setSummary(summaryData);
        setDisputes(disputeData);
        setAudit(auditData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load admin dashboard"));
  }, []);

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--risk)" }}>Operations · live database</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Vault platform · admin overview.</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={() => window.print()}>Export report</button>
        </div>
      </div>

      {error && <div className="warn-banner" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Locked GMV</span><span className="val">{summary.totalLocked.toFixed(3)} Ξ</span><span className="delta">active escrows only</span></div>
        <div className="metric"><span className="lab">Estimated fees</span><span className="val">{summary.estimatedFees.toFixed(3)} Ξ</span><span className="delta">from current locked value</span></div>
        <Link href="/admin/disputes" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="metric" style={{ cursor: "pointer" }}><span className="lab">Active disputes</span><span className="val" style={{ color: "var(--warn)" }}>{summary.activeDisputes}</span><span className="delta" style={{ color: "var(--warn)" }}>requires review</span></div>
        </Link>
        <div className="metric"><span className="lab">Active escrows</span><span className="val">{summary.activeEscrows}</span><span className="delta">not released/refunded</span></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", gap: 22, marginBottom: 22 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Operational queues</div>
          <div className="col" style={{ gap: 14 }}>
            <HealthBar label="Listing approval queue" count={summary.pendingListings} href="/admin/listings" />
            <HealthBar label="Open support tickets" count={summary.openTickets} href="/admin/tickets" />
            <HealthBar label="Pending verifications" count={summary.pendingVerifications} href="/admin/verifications" />
            <HealthBar label="Active disputes" count={summary.activeDisputes} href="/admin/disputes" />
          </div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Settlement Health</div>
          <div className="metric"><span className="lab">Escrow utilization</span><span className="val">{summary.totalLocked.toFixed(3)} Ξ</span><span className="delta">live locked funds</span></div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="row between" style={{ padding: 16, borderBottom: "1px solid var(--line)" }}>
            <span className="eyebrow">Hot disputes</span>
            <Link href="/admin/disputes" className="btn ghost sm">View all →</Link>
          </div>
          <table className="tbl">
            <thead><tr><th>Case</th><th>Market</th><th>Filed</th><th className="right">Frozen</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {disputes.filter(d => d.status !== "resolved").slice(0, 5).length === 0 ? (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 24 }}>No active disputes.</td></tr>
              ) : disputes.filter(d => d.status !== "resolved").slice(0, 5).map(d => (
                <tr key={d.id} style={{ cursor: "pointer" }}>
                  <td><div className="mono" style={{ color: "var(--ink)" }}>{d.id}</div><div className="muted-2" style={{ fontSize: 11 }}>{d.reason}</div></td>
                  <td>{d.market}</td>
                  <td className="muted">{new Date(d.filed).toLocaleDateString()}</td>
                  <td className="right mono">{d.frozen.toLocaleString()} {d.currency}</td>
                  <td><DisputeStatus s={d.status}/></td>
                  <td className="right"><Icon.arrow style={{ color: "var(--ink-3)" }}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Recent admin activity</div>
          <div className="col" style={{ gap: 0 }}>
            {audit.length === 0 && <div className="muted" style={{ padding: 18, textAlign: "center" }}>No audit events recorded yet.</div>}
            {audit.slice(0, 6).map((a, i) => (
              <div key={a.id} className="row" style={{ gap: 10, padding: "8px 0", borderTop: i ? "1px dashed var(--line)" : 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.who === "system" ? "var(--ink-4)" : "var(--risk)", marginTop: 8, flexShrink: 0 }}/>
                <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <div className="row between" style={{ gap: 8 }}>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{a.action}</span>
                    <span className="muted-2" style={{ fontSize: 10.5 }}>{new Date(a.t).toLocaleDateString()}</span>
                  </div>
                  <span className="muted-2" style={{ fontSize: 11.5 }}><span className="mono">{a.who}</span> · <span className="mono">{a.target}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function HealthBar({ label, count, href }: { label: string; count: number; href: string }) {
  const pct = Math.min(100, count * 10);
  return (
    <Link href={href} className="col" style={{ gap: 4, color: "inherit", textDecoration: "none" }}>
      <div className="row between"><span style={{ fontSize: 12.5 }}>{label}</span><span className="mono" style={{ fontSize: 12, color: count ? "var(--warn)" : "var(--accent)" }}>{count}</span></div>
      <div className="bar"><i style={{ width: pct + "%", background: count ? "var(--warn)" : "var(--accent)" }}/></div>
    </Link>
  );
}

function DisputeStatus({ s }: { s: string }) {
  const m: Record<string, { c: string; t: string }> = {
    new: { c: "var(--risk)", t: "New" },
    evidence: { c: "var(--warn)", t: "Evidence" },
    review: { c: "var(--info)", t: "Review" },
    resolved: { c: "var(--accent)", t: "Resolved" },
  };
  const st = m[s] || { c: "var(--ink-3)", t: s };
  return <span className="pill" style={{ background: `color-mix(in oklab, ${st.c} 14%, transparent)`, color: st.c, borderColor: `color-mix(in oklab, ${st.c} 30%, transparent)` }}><span className="pdot" style={{ background: st.c }}/>{st.t}</span>;
}
