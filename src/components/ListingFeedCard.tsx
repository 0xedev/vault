"use client";

import type React from "react";
import Link from "next/link";
import Icon from "@/components/icons";

type ListingFeedStat = {
  label: string;
  value: React.ReactNode;
};

export default function ListingFeedCard({
  href,
  icon,
  title,
  subtitle,
  stats,
  price,
  priceMeta = "USDC",
  badge,
  onShare,
  actions,
  children,
  className = "",
}: {
  href?: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  stats: ListingFeedStat[];
  price: React.ReactNode;
  priceMeta?: React.ReactNode;
  badge?: React.ReactNode;
  onShare?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={`listing-feed-card market-action-card ${className}`.trim()}>
      {href && (
        <Link href={href} className="ghost-hit-area" aria-label={`View ${title}`} />
      )}
      {onShare && (
        <button
          type="button"
          className="card-icon-btn listing-share-btn"
          onClick={onShare}
          aria-label={`Share ${title}`}
          title="Share"
        >
          <Icon.share />
        </button>
      )}
      <div className="listing-feed-head">
        <span className="listing-feed-icon">{icon}</span>
        <div className="listing-feed-title">
          <strong className="trunc">{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {badge && <span className="listing-feed-badge">{badge}</span>}
      </div>
      <div className="listing-feed-stats">
        {stats.slice(0, 3).map((stat) => (
          <div key={stat.label}>
            <span className="meta">{stat.label}</span>
            <span className="amt mono">{stat.value}</span>
          </div>
        ))}
      </div>
      <div className="listing-feed-price">
        <span className="meta">Asking</span>
        <span className="mono">
          {price} <small>{priceMeta}</small>
        </span>
      </div>
      {actions && <div className="listing-feed-actions">{actions}</div>}
      {children}
    </article>
  );
}
