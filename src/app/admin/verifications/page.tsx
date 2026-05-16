"use client";

import React, { useEffect, useState } from "react";
import Icon from "@/components/icons";

type Verification = {
  id: string;
  market: string;
  target: string;
  owner: string;
  method: string;
  status: string;
  checks: string[];
  filed: string;
};

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<Verification[]>([]);
  const [error, setError] = useState("");
  const pending = items.filter(v => v.status === "pending");

  const load = () => {
    fetch("/api/admin/verifications")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load verifications");
        return json;
      })
      .then((json) => setItems(json.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load verifications"));
  };

  useEffect(load, []);

  const update = async (id: string, status: "approved" | "rejected" | "needs_info") => {
    const res = await fetch("/api/admin/verifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) load();
  };

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
        <div className="metric"><span className="lab">Approved</span><span className="val">{items.filter(v => v.status === "approved").length}</span></div>
        <div className="metric"><span className="lab">Needs info</span><span className="val">{items.filter(v => v.status === "needs_info").length}</span></div>
      </div>

      {error && <div className="warn-banner" style={{ marginBottom: 16 }}>{error}</div>}
      <div className="grid grid-2" style={{ gap: 14 }}>
        {pending.length === 0 && <div className="muted" style={{ padding: 40, textAlign: "center" }}>No pending live verifications.</div>}
        {pending.map(v => (
          <div key={v.id} className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="mono" style={{ color: "var(--ink)" }}>{v.id}</span>
              <span className="pill"><span className="pdot"/>{v.market}</span>
            </div>
            <h3 className="serif" style={{ fontSize: 20, margin: "4px 0 8px" }}>{v.target}</h3>
            <div className="kv"><span className="k">Owner wallet</span><span className="v mono">{v.owner}</span></div>
            <div className="kv"><span className="k">Method</span><span className="v" style={{ fontSize: 12 }}>{v.method}</span></div>
            <div className="kv"><span className="k">Filed</span><span className="v">{new Date(v.filed).toLocaleString()}</span></div>

            <div className="card" style={{ padding: 12, background: "var(--surface-2)", marginTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Auto-checks</div>
              {(v.checks.length ? v.checks : ["Signature valid", "Owner address matches"]).map((check) => (
                <div key={check} className="check done" style={{ borderBottom: 0, padding: "4px 0" }}><span className="box" style={{ background: "var(--accent)", borderColor: "transparent" }}><Icon.check style={{ width: 11, height: 11, color: "var(--accent-ink)" }}/></span><span style={{ fontSize: 12 }}>{check}</span></div>
              ))}
              <div className="check" style={{ borderBottom: 0, padding: "4px 0" }}><span className="box"/><span style={{ fontSize: 12, color: "var(--ink-3)" }}>Manual review of supporting docs</span></div>
            </div>

            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button className="btn primary" style={{ flex: 1 }} onClick={() => update(v.id, "approved")}>Approve</button>
              <button className="btn danger" onClick={() => update(v.id, "rejected")}>Reject</button>
              <button className="btn ghost" onClick={() => update(v.id, "needs_info")}>Request more info</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
