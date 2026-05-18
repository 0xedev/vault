"use client";

import React, { useEffect, useState } from "react";

type AuditRow = {
  id: string;
  t: string;
  who: string;
  action: string;
  target: string;
  note: string;
};

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/audit")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load audit log");
        return json;
      })
      .then((json) => setRows(json.data || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load audit log"));
  }, []);

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Audit Log</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Every admin action, signed and immutable.</h1>
        </div>
        <button className="btn" onClick={() => {
          const csv = "time,admin,action,target,note\n" + rows.map((a) => `${a.t},${a.who},${a.action},${a.target},${a.note}`).join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "vault-audit.csv";
          a.click();
        }}>Export full log</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th><th>Note</th></tr></thead>
          <tbody>
            {error ? (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>No audit events recorded yet.</td></tr>
            ) : rows.map((a) => (
              <tr key={a.id}>
                <td className="muted mono">{new Date(a.t).toLocaleString()}</td>
                <td className="mono" style={{ color: a.who === "system" ? "var(--ink-3)" : "var(--risk)" }}>{a.who}</td>
                <td><span className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{a.action}</span></td>
                <td className="mono">{a.target}</td>
                <td className="muted" style={{ fontSize: 12 }}>{a.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
