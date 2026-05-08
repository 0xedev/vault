"use client";

import React, { useState } from "react";
import { OTC_ADS, OTC_CRYPTOS, OTC_FIATS, OTC_PAYMENTS } from "@/lib/data";

export default function OTCPage() {
  const [side, setSide] = useState("buy");
  const [crypto, setCrypto] = useState("USDC");
  const [fiat, setFiat] = useState("USD");
  const [pay, setPay] = useState("all");

  const filt = OTC_ADS.filter(a =>
    (side === "buy" ? a.type === "sell" : a.type === "buy") &&
    a.crypto === crypto && a.fiat === fiat &&
    (pay === "all" || a.payments.includes(pay))
  );
  const market = OTC_CRYPTOS.find(c => c.code === crypto)?.market[fiat] || 1;

  const fmtFiat = (n: number) => {
    const f = OTC_FIATS.find(x => x.code === fiat);
    const sym = f?.sym || "$";
    if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;
    if (n >= 1) return `${sym}${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    return `${sym}${n.toFixed(4)}`;
  };

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: "center", marginBottom: 22, gap: 24, rowGap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div className="eyebrow">OTC · P2P Trading</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Trade <em style={{ fontFamily: "var(--display)", fontStyle: "italic" }}>crypto</em> ↔ <em style={{ fontFamily: "var(--display)", fontStyle: "italic" }}>fiat</em> directly with verified merchants.
          </h1>
        </div>
        <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="col right" style={{ gap: 1 }}>
            <span className="smallcaps">24h volume</span>
            <span className="mono" style={{ fontSize: 14 }}>$8.42m</span>
          </div>
          <div className="col right" style={{ gap: 1 }}>
            <span className="smallcaps">Online merchants</span>
            <span className="mono" style={{ fontSize: 14 }}>{OTC_ADS.filter(a => a.online).length} / {new Set(OTC_ADS.map(a => a.merchant)).size}</span>
          </div>
        </div>
      </div>

      <div className="otc-tabs">
        <button className={"otc-tab" + (side === "buy" ? " active buy" : "")} onClick={() => setSide("buy")}>
          <span className="lg">Buy {crypto}</span>
          <span className="muted-2 mono" style={{ fontSize: 12 }}>{OTC_ADS.filter(a => a.type === "sell" && a.crypto === crypto && a.fiat === fiat).length} merchants offering</span>
        </button>
        <button className={"otc-tab" + (side === "sell" ? " active sell" : "")} onClick={() => setSide("sell")}>
          <span className="lg">Sell {crypto}</span>
          <span className="muted-2 mono" style={{ fontSize: 12 }}>{OTC_ADS.filter(a => a.type === "buy" && a.crypto === crypto && a.fiat === fiat).length} merchants buying</span>
        </button>
      </div>

      <div className="card" style={{ padding: 14, marginTop: 14 }}>
        <div className="row" style={{ gap: 18, flexWrap: "wrap", alignItems: "center" }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="smallcaps">Crypto</span>
            <div className="seg">
              {OTC_CRYPTOS.map(c => <button key={c.code} className={crypto === c.code ? "active" : ""} onClick={() => setCrypto(c.code)}>{c.code}</button>)}
            </div>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="smallcaps">Fiat</span>
            <div className="seg">
              {OTC_FIATS.map(f => <button key={f.code} className={fiat === f.code ? "active" : ""} onClick={() => setFiat(f.code)}>{f.code}</button>)}
            </div>
          </div>
          <div className="vsep" style={{ height: 36 }}/>
          <div className="col" style={{ gap: 4 }}>
            <span className="smallcaps">Payment method</span>
            <select className="select" value={pay} onChange={e => setPay(e.target.value)} style={{ height: 36, width: 180 }}>
              <option value="all">All payment methods</option>
              {OTC_PAYMENTS.filter(p => p.fiat.includes(fiat)).map(p => <option key={p.id} value={p.id}>{p.t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14, alignItems: "center", padding: "16px 4px", flexWrap: "wrap" }}>
        <span className="smallcaps">Market price</span>
        <span className="mono" style={{ fontSize: 16, color: "var(--ink)" }}>
          1 {crypto} = {fmtFiat(market)}
        </span>
        <span className="muted-2" style={{ fontSize: 11.5 }}>· via Pyth + Chainlink, refreshed 30s</span>
      </div>

      {filt.length === 0 ? (
        <div className="card" style={{ padding: 80, textAlign: "center" }}>
          <div className="muted" style={{ fontSize: 14 }}>No active ads for {crypto} / {fiat} via this payment method.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="tbl otc-tbl">
            <thead>
              <tr>
                <th style={{ width: "26%" }}>Merchant</th>
                <th className="right">Price ({fiat})</th>
                <th className="right">Available · Limits</th>
                <th>Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filt.map(a => {
                const price = market * (1 + a.spread / 100);
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                        <div className="x-avatar" style={{ width: 36, height: 36, fontSize: 12, position: "relative" }}>
                          {a.merchant.slice(0, 2).toUpperCase()}
                          {a.online && <span style={{ position: "absolute", bottom: -1, right: -1, width: 9, height: 9, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--bg)" }}/>}
                        </div>
                        <div className="col" style={{ gap: 2 }}>
                          <span className="mono" style={{ fontSize: 13 }}>{a.merchant}</span>
                          <div className="row" style={{ gap: 6 }}>
                            <span className="pill gold" style={{ fontSize: 10, padding: "1px 6px" }}>{a.verified}</span>
                            <span className="muted-2 mono" style={{ fontSize: 10.5 }}>{a.trades} trades · {a.rep}%</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="right">
                      <span className="mono" style={{ fontSize: 16 }}>{fmtFiat(price)}</span>
                      <div className="muted-2" style={{ fontSize: 11 }}>
                        {a.spread > 0 ? "+" : ""}{a.spread}% vs market
                      </div>
                    </td>
                    <td className="right">
                      <span className="mono" style={{ fontSize: 13 }}>{fmtFiat(a.min)} — {fmtFiat(a.max)}</span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                        {a.payments.map(p => (
                          <span key={p} className="pay-pill">{OTC_PAYMENTS.find(x => x.id === p)?.t || p}</span>
                        ))}
                        <span className="pill" style={{ background: a.release === "auto" ? "color-mix(in oklab, var(--accent) 14%, transparent)" : "var(--surface-2)", color: a.release === "auto" ? "var(--accent)" : "var(--ink-3)", borderColor: "color-mix(in oklab, currentColor 30%, transparent)" }}>
                          {a.release} release
                        </span>
                      </div>
                    </td>
                    <td className="right">
                      <button className="btn primary">Trade</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
