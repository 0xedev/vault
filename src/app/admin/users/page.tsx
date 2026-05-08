"use client";

import React, { useState } from "react";
import { ADMIN_USERS } from "@/lib/admin-data";

export default function AdminUsersPage() {
  const [tab, setTab] = useState("all");
  const list = ADMIN_USERS.filter(u => tab === "all" || u.status === tab);

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">User Management</div>
          <h1 className="h2" style={{ marginTop: 8 }}>KYC, freezes, bans · all wallet-keyed.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Total accounts</span><span className="val">12,840</span></div>
        <div className="metric"><span className="lab">Tier-2 KYC</span><span className="val">8,124</span></div>
        <div className="metric"><span className="lab">Frozen</span><span className="val" style={{ color: "var(--warn)" }}>{ADMIN_USERS.filter(u => u.status === "frozen").length}</span></div>
        <div className="metric"><span className="lab">Banned</span><span className="val" style={{ color: "var(--risk)" }}>{ADMIN_USERS.filter(u => u.status === "banned").length}</span></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="row between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: 12 }}>
          <div className="chips">
            {[["all", "All"], ["active", "Active"], ["frozen", "Frozen"], ["banned", "Banned"]].map(([k, t]) => (
              <button key={k} className={"chip" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>
                {t} <span className="count">{ADMIN_USERS.filter(u => k === "all" || u.status === k).length}</span>
              </button>
            ))}
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Wallet</th><th>Handle</th><th>Joined</th><th className="right">Trades</th><th>KYC</th><th>Flags</th><th className="right">In escrow</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.addr}>
                <td className="mono" style={{ color: "var(--ink)" }}>{u.addr}</td>
                <td>{u.handle === "—" ? <span className="muted-2">—</span> : u.handle}</td>
                <td className="muted">{u.joined}</td>
                <td className="right mono">{u.trades.toLocaleString()}</td>
                <td><span className="pill" style={{
                  background: u.kyc === "tier-2" ? "color-mix(in oklab, var(--accent) 14%, transparent)" : u.kyc === "tier-1" ? "color-mix(in oklab, var(--info) 14%, transparent)" : "var(--surface-2)",
                  color: u.kyc === "tier-2" ? "var(--accent)" : u.kyc === "tier-1" ? "var(--info)" : "var(--ink-3)",
                  borderColor: "color-mix(in oklab, currentColor 30%, transparent)",
                }}>{u.kyc}</span></td>
                <td>{u.flags > 0 ? <span style={{ color: u.flags >= 3 ? "var(--risk)" : "var(--warn)", fontFamily: "var(--mono)", fontSize: 12 }}>{u.flags}</span> : <span className="muted-2">—</span>}</td>
                <td className="right mono">{u.locked > 0 ? `${u.locked} Ξ` : <span className="muted-2">—</span>}</td>
                <td>
                  {u.status === "active" && <span className="pill funded"><span className="pdot"/>Active</span>}
                  {u.status === "frozen" && <span className="pill warn"><span className="pdot"/>Frozen</span>}
                  {u.status === "banned" && <span className="pill" style={{ background: "color-mix(in oklab, var(--risk) 14%, transparent)", color: "var(--risk)", borderColor: "color-mix(in oklab, var(--risk) 30%, transparent)" }}><span className="pdot" style={{ background: "var(--risk)" }}/>Banned</span>}
                </td>
                <td className="right">
                  <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    {u.status === "active" && <button className="btn sm">Freeze</button>}
                    {u.status === "frozen" && <button className="btn sm primary">Unfreeze</button>}
                    {u.status !== "banned" && <button className="btn sm danger">Ban</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
