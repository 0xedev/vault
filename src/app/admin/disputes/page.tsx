"use client";

import React, { useState } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { ADMIN_DISPUTES } from "@/lib/admin-data";

export default function AdminDisputesPage() {
  const [tab, setTab] = useState("all");
  const list = ADMIN_DISPUTES.filter(d => tab === "all" || d.status === tab);

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--risk)" }}>Dispute Queue</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Resolve cases · weigh evidence · settle on-chain.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Open cases</span><span className="val">{ADMIN_DISPUTES.filter(d => d.status !== "resolved").length}</span><span className="delta">across all markets</span></div>
        <div className="metric"><span className="lab">Avg resolution</span><span className="val">3.2d</span><span className="delta">under SLA</span></div>
        <div className="metric"><span className="lab" style={{ color: "var(--risk)" }}>High priority</span><span className="val" style={{ color: "var(--risk)" }}>{ADMIN_DISPUTES.filter(d => d.priority === "high" && d.status !== "resolved").length}</span><span className="delta down">action needed</span></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="row between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: 12 }}>
          <div className="chips">
            {[["all", "All"], ["new", "New"], ["evidence", "Evidence"], ["review", "Review"], ["resolved", "Resolved"]].map(([k, t]) => (
              <button key={k} className={"chip" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>
                {t} <span className="count">{ADMIN_DISPUTES.filter(d => k === "all" || d.status === k).length}</span>
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
            {list.map(d => (
              <tr key={d.id} style={{ cursor: "pointer" }}>
                <td><Link href="/admin/disputes" style={{ color: "inherit", textDecoration: "none" }}><div className="mono" style={{ color: "var(--ink)" }}>{d.id}</div></Link><div className="muted-2" style={{ fontSize: 11 }}>{d.filed}</div></td>
                <td><div className="col" style={{ gap: 1 }}><span className="mono" style={{ fontSize: 12.5 }}>{d.filer}</span><span className="muted-2 mono" style={{ fontSize: 11 }}>→ {d.against}</span></div></td>
                <td>{d.market}</td>
                <td><span style={{ fontSize: 12.5 }}>{d.reason}</span><div className="muted-2" style={{ fontSize: 11 }}>{d.asset}</div></td>
                <td className="right mono">{d.frozen.toLocaleString()} {d.currency}</td>
                <td className="muted">{d.age_h < 1 ? "<1h" : d.age_h < 24 ? d.age_h + "h" : Math.floor(d.age_h / 24) + "d"}</td>
                <td><span className="pill" style={{
                  background: d.priority === "high" ? "color-mix(in oklab, var(--risk) 14%, transparent)" : d.priority === "med" ? "color-mix(in oklab, var(--warn) 14%, transparent)" : "var(--surface-2)",
                  color: d.priority === "high" ? "var(--risk)" : d.priority === "med" ? "var(--warn)" : "var(--ink-3)",
                  borderColor: "color-mix(in oklab, currentColor 30%, transparent)",
                }}>{d.priority}</span></td>
                <td><DisputeStatus s={d.status}/></td>
                <td className="right"><Icon.arrow style={{ color: "var(--ink-3)" }}/></td>
              </tr>
            ))}
          </tbody>
        </table>
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
