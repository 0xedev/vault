"use client";

import Link from "next/link";
import Icon from "@/components/icons";
import { ADMIN_DISPUTES, ADMIN_LISTINGS, ADMIN_AUDIT } from "@/lib/admin-data";
import { ESCROWS } from "@/lib/data";

export default function AdminDashboardPage() {
  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--risk)" }}>Operations · Apr 30, 14:22 UTC</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Vault platform · admin overview.</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="seg"><button className="active">7d</button><button>30d</button><button>All</button></div>
          <button className="btn">Export report</button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="metric"><span className="lab">GMV (7d)</span><span className="val">2,184 Ξ</span><span className="delta" style={{ color: "var(--accent)" }}>+ 12.4% vs prior</span></div>
        <div className="metric"><span className="lab">Platform fees</span><span className="val">38.2 Ξ</span><span className="delta" style={{ color: "var(--accent)" }}>+ 18.0% vs prior</span></div>
        <Link href="/admin/disputes" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="metric" style={{ cursor: "pointer" }}><span className="lab">Active disputes</span><span className="val" style={{ color: "var(--warn)" }}>{ADMIN_DISPUTES.filter(d => d.status !== "resolved").length}</span><span className="delta" style={{ color: "var(--warn)" }}>3 high priority</span></div>
        </Link>
        <div className="metric"><span className="lab">Default rate</span><span className="val">1.4%</span><span className="delta" style={{ color: "var(--accent)" }}>− 0.2pp vs prior</span></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", gap: 22, marginBottom: 22 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="row between" style={{ marginBottom: 18 }}>
            <div className="eyebrow">Volume by marketplace · 7d</div>
            <div className="row" style={{ gap: 6, fontSize: 11, color: "var(--ink-4)" }}>
              <span style={{ width: 8, height: 8, background: "var(--gold)", borderRadius: 2, display: "inline-block" }}/>NFT Loans
              <span style={{ width: 8, height: 8, background: "#A78BFA", borderRadius: 2, display: "inline-block", marginLeft: 8 }}/>Mini Apps
              <span style={{ width: 8, height: 8, background: "#8BB7FF", borderRadius: 2, display: "inline-block", marginLeft: 8 }}/>X · Farc.
              <span style={{ width: 8, height: 8, background: "var(--accent)", borderRadius: 2, display: "inline-block", marginLeft: 8 }}/>OTC
            </div>
          </div>
          <StackedBars/>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Health</div>
          <div className="col" style={{ gap: 14 }}>
            <HealthBar label="Settlement success" pct={99.6} color="var(--accent)" sub="" />
            <HealthBar label="Avg dispute resolution" pct={68} color="var(--accent)" sub="3.2 days · target 4d" />
            <HealthBar label="KYC backlog" pct={42} color="var(--warn)" sub="14 pending · 4h SLA" />
            <HealthBar label="Escrow utilization" pct={72} color="var(--info)" sub="287 Ξ locked / 400 Ξ cap" />
            <HealthBar label="Listing approval queue" pct={28} color="var(--info)" sub={ADMIN_LISTINGS.filter(l => l.status === "pending").length + " awaiting"} />
          </div>
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
              {ADMIN_DISPUTES.filter(d => d.status !== "resolved").slice(0, 5).map(d => (
                <tr key={d.id} style={{ cursor: "pointer" }}>
                  <td><div className="mono" style={{ color: "var(--ink)" }}>{d.id}</div><div className="muted-2" style={{ fontSize: 11 }}>{d.reason}</div></td>
                  <td>{d.market}</td>
                  <td className="muted">{d.filed}</td>
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
            {ADMIN_AUDIT.slice(0, 6).map((a, i) => (
              <div key={i} className="row" style={{ gap: 10, padding: "8px 0", borderTop: i ? "1px dashed var(--line)" : 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.who === "system" ? "var(--ink-4)" : "var(--risk)", marginTop: 8, flexShrink: 0 }}/>
                <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <div className="row between" style={{ gap: 8 }}>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{a.action}</span>
                    <span className="muted-2" style={{ fontSize: 10.5 }}>{a.t}</span>
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

function StackedBars() {
  const data = [
    { d: "Apr 24", a: 28, b: 14, c: 8,  e: 18 },
    { d: "Apr 25", a: 32, b: 22, c: 6,  e: 24 },
    { d: "Apr 26", a: 18, b: 18, c: 12, e: 30 },
    { d: "Apr 27", a: 24, b: 28, c: 10, e: 26 },
    { d: "Apr 28", a: 38, b: 32, c: 14, e: 34 },
    { d: "Apr 29", a: 30, b: 24, c: 18, e: 42 },
    { d: "Apr 30", a: 42, b: 34, c: 16, e: 48 },
  ];
  const max = Math.max(...data.map(x => x.a + x.b + x.c + x.e));
  return (
    <div style={{ height: 200, display: "flex", alignItems: "flex-end", gap: 12, paddingTop: 8 }}>
      {data.map(x => {
        const total = x.a + x.b + x.c + x.e;
        const h = (total / max) * 180;
        return (
          <div key={x.d} className="col" style={{ flex: 1, gap: 6, alignItems: "center" }}>
            <div style={{ width: "100%", height: h, display: "flex", flexDirection: "column-reverse", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ background: "var(--gold)", height: x.a / total * 100 + "%" }}/>
              <div style={{ background: "#A78BFA",      height: x.b / total * 100 + "%" }}/>
              <div style={{ background: "#8BB7FF",      height: x.c / total * 100 + "%" }}/>
              <div style={{ background: "var(--accent)",height: x.e / total * 100 + "%" }}/>
            </div>
            <span className="muted-2 mono" style={{ fontSize: 10 }}>{x.d.slice(4)}</span>
          </div>
        );
      })}
    </div>
  );
}

function HealthBar({ label, pct, color, sub }: { label: string; pct: number; color: string; sub: string }) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="row between"><span style={{ fontSize: 12.5 }}>{label}</span><span className="mono" style={{ fontSize: 12, color }}>{pct}%</span></div>
      <div className="bar"><i style={{ width: pct + "%", background: color }}/></div>
      {sub && <span className="muted-2" style={{ fontSize: 10.5 }}>{sub}</span>}
    </div>
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
