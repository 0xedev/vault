"use client";

import React, { useState } from "react";
import { ADMIN_LISTINGS } from "@/lib/admin-data";

export default function AdminListingsPage() {
  const [tab, setTab] = useState("pending");
  const list = ADMIN_LISTINGS.filter(l => tab === "all" || l.status === tab);

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Listing Moderation</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Approve or reject listings before they go live.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Pending</span><span className="val">{ADMIN_LISTINGS.filter(l => l.status === "pending").length}</span></div>
        <div className="metric"><span className="lab">Approved (24h)</span><span className="val">28</span></div>
        <div className="metric"><span className="lab">Rejected (24h)</span><span className="val">4</span></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="row between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: 12 }}>
          <div className="chips">
            {[["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["all", "All"]].map(([k, t]) => (
              <button key={k} className={"chip" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>
                {t} <span className="count">{ADMIN_LISTINGS.filter(l => k === "all" || l.status === k).length}</span>
              </button>
            ))}
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Listing</th><th>Market</th><th>Seller</th><th className="right">Price</th><th>Risk</th><th>Flags</th><th>Filed</th><th></th></tr></thead>
          <tbody>
            {list.map(l => (
              <tr key={l.id}>
                <td><div style={{ fontSize: 13 }}>{l.title}</div><div className="muted-2 mono" style={{ fontSize: 11 }}>{l.id}</div></td>
                <td>{l.market}</td>
                <td className="mono">{l.seller}</td>
                <td className="right mono">{l.price}</td>
                <td>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <div style={{ width: 60, height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: l.risk + "%", background: l.risk > 70 ? "var(--risk)" : l.risk > 40 ? "var(--warn)" : "var(--accent)" }}/>
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: l.risk > 70 ? "var(--risk)" : l.risk > 40 ? "var(--warn)" : "var(--ink-3)" }}>{l.risk}</span>
                  </div>
                </td>
                <td>{l.flagged > 0 ? <span className="pill warn"><span className="pdot"/>{l.flagged}</span> : <span className="muted-2">—</span>}</td>
                <td className="muted">{l.age}</td>
                <td className="right">
                  {l.status === "pending" ? (
                    <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn sm danger">Reject</button>
                      <button className="btn sm primary">Approve</button>
                    </div>
                  ) : (
                    <span className="muted-2" style={{ fontSize: 12, textTransform: "capitalize" }}>{l.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
