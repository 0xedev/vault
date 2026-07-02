"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import Icon from "./icons";
import NFTArt from "./NFTArt";
import { Badge } from "@/components/ui/badge";
import { COLLECTIONS } from "@/lib/data";
import { fmtETH, fmtUSDC } from "@/lib/utils";
import { normalizeNftImageUrl } from "@/lib/nft-images";
import type { Loan } from "@/lib/data";

function NftImage({ l }: { l: Loan }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = normalizeNftImageUrl(l.imageUrl);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={`${COLLECTIONS[l.coll]} ${l.token}`}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={() => setFailed(true)}
      />
    );
  }
  return <NFTArt seed={l.coll} label={l.token} />;
}

export default function LoanCard({ l, onShare }: { l: Loan; onShare?: (loan: Loan) => void }) {
  const href = `/detail?id=${l.id}`;
  const label = `${COLLECTIONS[l.coll]} ${l.token}`;

  return (
    <article className="loan-card">
      <Link href={href} className="ghost-hit-area" aria-label={`View ${label}`} />
      <div className="loan-card-media" style={{ position: "relative" }}>
        <NftImage l={l} />
        <Badge variant="outline" className="pill floor-pill" style={{ position: "absolute", top: 8, right: 8, gap: 4 }}>
          <span className="pdot" style={{ background: "var(--gold)" }} />
          <span className="nowrap">{fmtETH(l.value)} Ξ floor</span>
          <span className="mono" style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>±3%</span>
        </Badge>
      </div>
      <div className="row between">
        <span className="nm trunc">{COLLECTIONS[l.coll]}</span>
        <span className="mono muted-2" style={{ fontSize: 11 }}>{l.token}</span>
      </div>
      <div className="row between">
        <div className="col" style={{ gap: 1 }}>
          <span className="meta">Borrow</span>
          <span className="amt">{fmtUSDC(l.amt)} <span style={{ fontSize: 12, color: "var(--ink-3)" }}>USDC</span></span>
        </div>
        <div className="col" style={{ gap: 1 }}>
          <span className="meta">APR</span>
          <span className="amt">{l.apr}<span style={{ fontSize: 12, color: "var(--ink-3)" }}>%</span></span>
        </div>
        <div className="col" style={{ gap: 1 }}>
          <span className="meta">Term</span>
          <span className="amt">{l.term}<span style={{ fontSize: 12, color: "var(--ink-3)" }}>d</span></span>
        </div>
      </div>
      <div>
        <div className="row between" style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 4 }}>
          <span>LTV {l.ltv}%</span><span>{l.bid} offers</span>
        </div>
        <div className="bar"><i style={{ width: l.ltv + "%", background: l.ltv > 65 ? "var(--warn)" : "var(--accent)" }} /></div>
      </div>
      <div className="listing-feed-actions">
        <Link href={href} className="btn primary sm" aria-label={`View ${label}`}>
          <Icon.arrow /> View
        </Link>
        {onShare && (
          <button
            type="button"
            className="btn sm"
            onClick={() => onShare(l)}
            aria-label={`Share ${label}`}
          >
            <Icon.share /> Share
          </button>
        )}
      </div>
    </article>
  );
}
