"use client";

import type React from "react";
import Link from "next/link";
import Icon from "@/components/icons";

type ListingFeedStat = {
  label: string;
  value: React.ReactNode;
};

function hasVisibleStatValue(value: React.ReactNode) {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return !["0", "0%", "0 usdc", "$0", "n/a", "none", "undefined", "null"].includes(normalized);
  }
  return true;
}

export default function ListingFeedCard({
  href,
  icon,
  title,
  subtitle,
  stats,
  price,
  priceMeta = "USDC",
  badge,
  imageUrl,
  imageAlt,
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
  imageUrl?: string | null;
  imageAlt?: string;
  onShare?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const visibleStats = stats.filter((stat) => hasVisibleStatValue(stat.value)).slice(0, 3);
  const mediaUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";

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
        <span className="listing-feed-icon">
          {icon}
          {mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="listing-feed-image"
              src={mediaUrl}
              alt={imageAlt || `${title} preview`}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
        </span>
        <div className="listing-feed-title">
          <strong className="trunc">{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {badge && <span className="listing-feed-badge">{badge}</span>}
      </div>
      {visibleStats.length > 0 && (
        <div className="listing-feed-stats">
          {visibleStats.map((stat) => (
            <div key={stat.label}>
              <span className="meta">{stat.label}</span>
              <span className="amt mono">{stat.value}</span>
            </div>
          ))}
        </div>
      )}
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
