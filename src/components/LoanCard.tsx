"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import Icon from "./icons";
import NFTArt from "./NFTArt";
import { COLLECTIONS } from "@/lib/data";
import { fmtUSDC } from "@/lib/utils";
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
      <div className="row between" style={{ fontSize: 11, color: "var(--ink-4)" }}>
        <span>{l.bid} offers</span>
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
