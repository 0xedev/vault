"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { useWallet } from "@/components/WalletProvider";
import { parseContractError } from "@/lib/contract";

type AdminDispute = {
  id: string;
  filed: string;
  filer: string;
  against: string;
  market: string;
  asset: string;
  frozen: number;
  currency: string;
  reason: string;
  status: string;
  priority: string;
};

export default function AdminDisputesPage() {
  const [tab, setTab] = useState("all");
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<AdminDispute | null>(null);
  const [verdict, setVerdict] = useState<"release" | "refund" | "split">("refund");
  const [buyerPct, setBuyerPct] = useState(0);
  const { address } = useWallet();
  const list = disputes.filter(d => tab === "all" || d.status === tab);

  const handleResolve = async () => {
    if (!address || !resolveModal) return;
    setResolving(resolveModal.id);
    try {
      // Try resolving via API first
      const res = await fetch(`/api/admin/disputes/${resolveModal.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdict,
          buyerAmount: verdict === "split" ? Math.round(buyerPct / 100 * resolveModal.frozen * 1e18) / 1e18 : 0,
          sellerAmount: verdict === "split" ? Math.round((100 - buyerPct) / 100 * resolveModal.frozen * 1e18) / 1e18 : 0,
          note: `Admin resolved via ${verdict}`,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Resolution failed");
      setDisputes((prev) => prev.map((d) => d.id === resolveModal.id ? { ...d, status: "resolved" } : d));
      setResolveModal(null);
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setResolving(null);
    }
  };

  useEffect(() => {
    fetch("/api/disputes")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load disputes");
        return json;
      })
      .then((json) => setDisputes(json.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load disputes"));
  }, []);

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--risk)" }}>Dispute Queue</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Resolve cases · weigh evidence · settle on-chain.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Open cases</span><span className="val">{disputes.filter(d => d.status !== "resolved").length}</span><span className="delta">across live escrows</span></div>
        <div className="metric"><span className="lab">Resolved</span><span className="val">{disputes.filter(d => d.status === "resolved").length}</span><span className="delta">closed cases</span></div>
        <div className="metric"><span className="lab" style={{ color: "var(--risk)" }}>High priority</span><span className="val" style={{ color: "var(--risk)" }}>{disputes.filter(d => d.priority === "high" && d.status !== "resolved").length}</span><span className="delta down">action needed</span></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="row between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: 12 }}>
          <div className="chips">
            {[["all", "All"], ["new", "New"], ["evidence", "Evidence"], ["review", "Review"], ["resolved", "Resolved"]].map(([k, t]) => (
              <button key={k} className={"chip" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>
                {t} <span className="count">{disputes.filter(d => k === "all" || d.status === k).length}</span>
              </button>
            ))}
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Case</th><th>Filer → Against</th><th>Market</th><th>Reason</th>
              <th className="right">Frozen</th><th>Age</th><th>Priority</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan={9} className="muted" style={{ textAlign: "center", padding: 24 }}>{error}</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={9} className="muted" style={{ textAlign: "center", padding: 24 }}>No live disputes match this filter.</td></tr>
            ) : list.map(d => (
              <tr key={d.id} style={{ cursor: "pointer" }}>
                <td><Link href="/admin/disputes" style={{ color: "inherit", textDecoration: "none" }}><div className="mono" style={{ color: "var(--ink)" }}>{d.id}</div></Link><div className="muted-2" style={{ fontSize: 11 }}>{new Date(d.filed).toLocaleString()}</div></td>
                <td><div className="col" style={{ gap: 1 }}><span className="mono" style={{ fontSize: 12.5 }}>{d.filer}</span><span className="muted-2 mono" style={{ fontSize: 11 }}>→ {d.against}</span></div></td>
                <td>{d.market}</td>
                <td><span style={{ fontSize: 12.5 }}>{d.reason}</span><div className="muted-2" style={{ fontSize: 11 }}>{d.asset}</div></td>
                <td className="right mono">{d.frozen.toLocaleString()} {d.currency}</td>
                <td className="muted">{new Date(d.filed).toLocaleDateString()}</td>
                <td><span className="pill" style={{
                  background: d.priority === "high" ? "color-mix(in oklab, var(--risk) 14%, transparent)" : d.priority === "med" ? "color-mix(in oklab, var(--warn) 14%, transparent)" : "var(--surface-2)",
                  color: d.priority === "high" ? "var(--risk)" : d.priority === "med" ? "var(--warn)" : "var(--ink-3)",
                  borderColor: "color-mix(in oklab, currentColor 30%, transparent)",
                }}>{d.priority}</span></td>
                <td><DisputeStatus s={d.status}/></td>
                <td className="right">
                  {d.status !== "resolved" ? (
                    <button className="btn sm primary" onClick={() => setResolveModal(d)}>Resolve</button>
                  ) : (
                    <Icon.arrow style={{ color: "var(--ink-3)" }} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resolveModal && (
        <div className="modal-bg" onClick={() => setResolveModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-h">
              <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>Resolve dispute</h3>
              <button className="btn ghost sm" onClick={() => setResolveModal(null)}><Icon.x /></button>
            </div>
            <div className="modal-b">
              <div className="col" style={{ gap: 14 }}>
                <div className="card" style={{ padding: 12, background: "var(--surface-2)" }}>
                  <div className="kv"><span className="k">Case</span><span className="v mono">{resolveModal.id}</span></div>
                  <div className="kv"><span className="k">Filer</span><span className="v mono">{resolveModal.filer}</span></div>
                  <div className="kv"><span className="k">Against</span><span className="v mono">{resolveModal.against}</span></div>
                  <div className="kv"><span className="k">Frozen</span><span className="v mono">{resolveModal.frozen} {resolveModal.currency}</span></div>
                  <div className="kv"><span className="k">Reason</span><span className="v">{resolveModal.reason}</span></div>
                </div>
                <div className="seg" style={{ width: "100%" }}>
                  {(["refund", "release", "split"] as const).map((v) => (
                    <button key={v} className={verdict === v ? "active" : ""} onClick={() => setVerdict(v)} style={{ flex: 1 }}>
                      {v === "refund" ? "Refund buyer" : v === "release" ? "Release to seller" : "Split"}
                    </button>
                  ))}
                </div>
                {verdict === "split" && (
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <span className="smallcaps">Buyer gets</span>
                    <input className="input mono" type="number" min={0} max={100} value={buyerPct} onChange={e => setBuyerPct(Number(e.target.value))} style={{ width: 80 }} />
                    <span className="muted">%</span>
                    <span className="mono muted-2" style={{ marginLeft: "auto" }}>Seller: {100 - buyerPct}%</span>
                  </div>
                )}
                {error && <div className="warn-banner" style={{ fontSize: 12 }}>{error}</div>}
                <button className="btn primary lg" style={{ width: "100%" }} onClick={handleResolve} disabled={resolving === resolveModal.id}>
                  {resolving === resolveModal.id ? "Resolving…" : `Confirm ${verdict}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-4)" }}>
        Also available via API: POST /api/admin/disputes/:id/resolve
      </div>
    </main>
  );
}

function DisputeStatus({ s }: { s: string }) {
  const m: Record<string, { c: string; t: string }> = {
    new:      { c: "var(--risk)",  t: "New" },
    evidence: { c: "var(--warn)",  t: "Evidence" },
    review:   { c: "var(--info)",  t: "Review" },
    resolved: { c: "var(--accent)",t: "Resolved" },
  };
  const st = m[s] || { c: "var(--ink-3)", t: s };
  return <span className="pill" style={{ background: `color-mix(in oklab, ${st.c} 14%, transparent)`, color: st.c, borderColor: `color-mix(in oklab, ${st.c} 30%, transparent)` }}><span className="pdot" style={{ background: st.c }}/>{st.t}</span>;
}
