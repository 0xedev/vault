import { ADMIN_AUDIT } from "@/lib/admin-data";

export default function AdminAuditPage() {
  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Audit Log</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Every admin action, signed and immutable.</h1>
        </div>
        <button className="btn">Export full log</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Target</th><th>Note</th></tr></thead>
          <tbody>
            {ADMIN_AUDIT.map((a, i) => (
              <tr key={i}>
                <td className="muted mono">{a.t}</td>
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
