"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { bundleAssetLabel, type BundleListing } from "@/lib/data";
import { fmtUSDC } from "@/lib/utils";

const ASSET_ICONS: Record<string, React.ReactNode> = {
  nft_loan: <Icon.loan />,
  mini_app: <Icon.app />,
  x_account: <Icon.xlogo />,
  farcaster: <Icon.cast />,
  clanker: <Icon.token />,
};

export default function BundleCard({ bundle, onShare }: { bundle: BundleListing; onShare?: (bundle: BundleListing) => void }) {
  const currency = bundle.currency || "USDC";
  const totalPrice = fmtUSDC(bundle.totalPrice);

  return (
    <article className="bundle-card">
      <Link href={`/market?tab=bundles&id=${encodeURIComponent(bundle.id)}`} className="ghost-hit-area" aria-label={`View ${bundle.name}`} />
      {onShare && (
        <button
          type="button"
          className="card-icon-btn listing-share-btn"
          onClick={() => onShare(bundle)}
          aria-label={`Share ${bundle.name}`}
          title="Share"
        >
          <Icon.share />
        </button>
      )}
      {bundle.imageUrl && (
        <div className="bundle-card-img">
          <img src={bundle.imageUrl} alt={bundle.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
      <div className="bundle-card-head">
        <Badge className="bundle-tag">Bundle</Badge>
        <strong className="bundle-name">{bundle.name}</strong>
        {bundle.description && (
          <span className="bundle-desc">{bundle.description}</span>
        )}
      </div>
      <div className="bundle-assets">
        {bundle.assets.slice(0, 5).map((asset) => (
          <div key={asset.id} className="bundle-asset-row">
            <span className="bundle-asset-icon">
              {ASSET_ICONS[asset.kind] || <Icon.asset />}
            </span>
            <span className="bundle-asset-label">{asset.label}</span>
            <span className="bundle-asset-kind">{bundleAssetLabel(asset.kind)}</span>
            {asset.price > 0 && (
              <span className="bundle-asset-price">{fmtUSDC(asset.price)} {currency}</span>
            )}
          </div>
        ))}
        {bundle.assets.length > 5 && (
          <div className="bundle-asset-more">
            +{bundle.assets.length - 5} more
          </div>
        )}
      </div>
      <Separator />
      <div className="bundle-card-foot">
        <span className="bundle-price">{totalPrice} {currency}</span>
        <span className="bundle-cta">View <Icon.arrow /></span>
      </div>
    </article>
  );
}
