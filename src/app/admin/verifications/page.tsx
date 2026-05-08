"use client";

import Icon from "@/components/icons";
import { ADMIN_VERIFICATIONS } from "@/lib/admin-data";

export default function AdminVerificationsPage() {
  const pending = ADMIN_VERIFICATIONS.filter(v => v.status === "pending");

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Verification Approvals</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Approve handle / FID / contract ownership claims.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Pending</span><span className="val">{pending.length}</span></div>
        <div className="metric"><span className="lab">Approved (7d)</span><span className="val">38</span></div>
        <div className="metric"><span className="lab">SLA target</span><span className="val">4h</span></div>
      </div>

      <div className="grid grid-2" style={{ gap: 14 }}>
        {pending.map(v => (
          <div key={v.id} className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="mono" style={{ color: "var(--ink)" }}>{v.id}</span>
              <span className="pill"><span className="pdot"/>{v.market}</span>
            </div>
            <h3 className="serif" style={{ fontSize: 20, margin: "4px 0 8px" }}>{v.target}</h3>
            <div className="kv"><span className="k">Owner wallet</span><span className="v mono">{v.owner}</span></div>
            <div className="kv"><span className="k">Method</span><span className="v" style={{ fontSize: 12 }}>{v.method}</span></div>
            <div className="kv"><span className="k">Filed</span><span className="v">{v.filed}</span></div>

            <div className="card" style={{ padding: 12, background: "var(--surface-2)", marginTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Auto-checks</div>
              <div className="check done" style={{ borderBottom: 0, padding: "4px 0" }}><span className="box" style={{ background: "var(--accent)", borderColor: "transparent" }}><Icon.check style={{ width: 11, height: 11, color: "var(--accent-ink)" }}/></span><span style={{ fontSize: 12 }}>Signature valid</span></div>
              <div className="check done" style={{ borderBottom: 0, padding: "4px 0" }}><span className="box" style={{ background: "var(--accent)", borderColor: "transparent" }}><Icon.check style={{ width: 11, height: 11, color: "var(--accent-ink)" }}/></span><span style={{ fontSize: 12 }}>Owner address matches</span></div>
              <div className="check" style={{ borderBottom: 0, padding: "4px 0" }}><span className="box"/><span style={{ fontSize: 12, color: "var(--ink-3)" }}>Manual review of supporting docs</span></div>
            </div>

            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button className="btn primary" style={{ flex: 1 }}>Approve</button>
              <button className="btn danger">Reject</button>
              <button className="btn ghost">Request more info</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
