"use client";

import React, { useEffect, useMemo, useState } from "react";

type AdminUser = {
  addr: string;
  address: string;
  handle: string;
  joined: string;
  trades: number;
  kyc: string;
  flags: number;
  locked: number;
  status: string;
};

export default function AdminUsersPage() {
  const [tab, setTab] = useState("all");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = () => {
    fetch("/api/admin/users")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load users");
        return json;
      })
      .then((json) => setUsers(json.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load users"));
  };

  useEffect(load, []);

  const list = useMemo(() => users.filter(u => tab === "all" || u.status === tab), [users, tab]);
  const updateStatus = async (address: string, status: "active" | "frozen" | "banned") => {
    setBusy(address);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, status }),
      });
      if (!res.ok) throw new Error("User update failed");
      load();
    } finally {
      setBusy("");
    }
  };

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">User Management</div>
          <h1 className="h2" style={{ marginTop: 8 }}>KYC, freezes, bans · all wallet-keyed.</h1>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">Total accounts</span><span className="val">{users.length}</span></div>
        <div className="metric"><span className="lab">KYC complete</span><span className="val">{users.filter(u => u.kyc !== "none").length}</span></div>
        <div className="metric"><span className="lab">Frozen</span><span className="val" style={{ color: "var(--warn)" }}>{users.filter(u => u.status === "frozen").length}</span></div>
        <div className="metric"><span className="lab">Banned</span><span className="val" style={{ color: "var(--risk)" }}>{users.filter(u => u.status === "banned").length}</span></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="row between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", flexWrap: "wrap", gap: 12 }}>
          <div className="chips">
            {[["all", "All"], ["active", "Active"], ["frozen", "Frozen"], ["banned", "Banned"]].map(([k, t]) => (
              <button key={k} className={"chip" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>
                {t} <span className="count">{users.filter(u => k === "all" || u.status === k).length}</span>
              </button>
            ))}
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Wallet</th><th>Handle</th><th>Joined</th><th className="right">Trades</th><th>KYC</th><th>Flags</th><th className="right">In escrow</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {error ? (
              <tr><td colSpan={9} className="muted" style={{ textAlign: "center", padding: 24 }}>{error}</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={9} className="muted" style={{ textAlign: "center", padding: 24 }}>No users match this filter.</td></tr>
            ) : list.map(u => (
              <tr key={u.address}>
                <td className="mono" style={{ color: "var(--ink)" }}>{u.addr}</td>
                <td>{u.handle || <span className="muted-2">-</span>}</td>
                <td className="muted">{new Date(u.joined).toLocaleDateString()}</td>
                <td className="right mono">{u.trades.toLocaleString()}</td>
                <td><span className="pill">{u.kyc}</span></td>
                <td>{u.flags > 0 ? <span style={{ color: u.flags >= 3 ? "var(--risk)" : "var(--warn)", fontFamily: "var(--mono)", fontSize: 12 }}>{u.flags}</span> : <span className="muted-2">-</span>}</td>
                <td className="right mono">{u.locked > 0 ? `${u.locked.toFixed(3)} Ξ` : <span className="muted-2">-</span>}</td>
                <td><UserStatus status={u.status} /></td>
                <td className="right">
                  <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    {u.status === "active" && <button className="btn sm" disabled={busy === u.address} onClick={() => updateStatus(u.address, "frozen")}>Freeze</button>}
                    {u.status === "frozen" && <button className="btn sm primary" disabled={busy === u.address} onClick={() => updateStatus(u.address, "active")}>Unfreeze</button>}
                    {u.status !== "banned" && <button className="btn sm danger" disabled={busy === u.address} onClick={() => updateStatus(u.address, "banned")}>Ban</button>}
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

function UserStatus({ status }: { status: string }) {
  if (status === "frozen") return <span className="pill warn"><span className="pdot"/>Frozen</span>;
  if (status === "banned") return <span className="pill" style={{ background: "color-mix(in oklab, var(--risk) 14%, transparent)", color: "var(--risk)", borderColor: "color-mix(in oklab, var(--risk) 30%, transparent)" }}><span className="pdot" style={{ background: "var(--risk)" }}/>Banned</span>;
  return <span className="pill funded"><span className="pdot"/>Active</span>;
}
