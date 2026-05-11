"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import StatusPill from "@/components/StatusPill";
import { fmtETH } from "@/lib/utils";
import type { Escrow } from "@/lib/data";

const stages = ["all", "Active", "Transfer", "Funds locked", "At risk", "Released"];

export default function EscrowCenterPage() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    fetch("/api/escrows")
      .then((r) => r.json())
      .then((json) => {
        setEscrows(json.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filt = escrows.filter((e) => tab === "all" || e.stage === tab);

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="eyebrow">Escrow Center</div>
          <h1 className="h2" style={{ marginTop: 8 }}>{escrows.length} active escrows · <span className="nowrap">287.4 Ξ</span> locked.</h1>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn">Export CSV</button>
          <button className="btn primary">New escrow</button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="metric"><span className="lab">Funds locked</span><span className="val">287.4 Ξ</span><span className="delta">across {escrows.length} deals</span></div>
        <div className="metric"><span className="lab">Assets locked</span><span className="val">14</span><span className="delta">8 NFTs · 6 bundles</span></div>
        <div className="metric"><span className="lab">At risk</span><span className="val" style={{ color: "var(--warn)" }}>{escrows.filter(e => e.stage === "At risk").length}</span><span className="delta down">action required</span></div>
        <div className="metric"><span className="lab">Platform fees · MTD</span><span className="val">3.241 Ξ</span><span className="delta">0.8% take rate</span></div>
      </div>

      <div className="card">
        <div className="row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", justifyContent: "space-between" }}>
          <div className="chips">
            {stages.map((s) => (
              <button key={s} className={"chip" + (tab === s ? " active" : "")} onClick={() => setTab(s)}>
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" placeholder="Search escrow id, asset…" style={{ width: 260, height: 32 }} />
          </div>
        </div>
        {loading ? (
          <div className="muted" style={{ padding: 40, textAlign: "center" }}>Loading escrows…</div>
        ) : (
          <table className="tbl">
            <thead><tr>
              <th>ID · Type</th><th>Counterparty</th><th>Asset</th><th className="right">Locked</th>
              <th>Stage</th><th>Deadline</th><th>Required action</th><th></th>
            </tr></thead>
            <tbody>
              {filt.map((e) => (
                <tr key={e.id} style={{ cursor: "pointer" }}>
                  <td>
                    <Link href="/deals" style={{ color: "inherit", textDecoration: "none" }}>
                      <div className="mono" style={{ color: "var(--ink)" }}>{e.id}</div>
                    </Link>
                    <div className="muted-2" style={{ fontSize: 11 }}>{e.kind}</div>
                  </td>
                  <td className="mono">{e.party}</td>
                  <td>{e.asset}</td>
                  <td className="right mono">{fmtETH(e.amount)} {e.asset_type}</td>
                  <td><StatusPill s={e.stage} /></td>
                  <td className="muted">{e.deadline}</td>
                  <td style={{ color: e.stage === "At risk" ? "var(--risk)" : "var(--ink-2)" }}>{e.action}</td>
                  <td className="right"><Icon.arrow style={{ color: "var(--ink-3)" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
