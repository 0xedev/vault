"use client";

import React, { useState } from "react";
import Link from "next/link";

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
    if (["n/a", "none", "undefined", "null"].includes(normalized)) return false;

    const numericValue = Number(
      normalized
        .replace(/[$,%]/g, "")
        .replace(/\busdc\b/g, "")
        .replace(/,/g, "")
        .trim(),
    );

    if (!Number.isNaN(numericValue) && numericValue === 0) return false;
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
  actions,
  description,
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
  actions?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const [showDescription, setShowDescription] = useState(false);
  const visibleStats = stats
    .filter(
      (stat) =>
        stat.label.trim().toLowerCase() !== "id" &&
        hasVisibleStatValue(stat.value),
    )
    .slice(0, 3);
  const mediaUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const hasDescription = Boolean(
    typeof description === "string" ? description.trim() : description,
  );

  return (
    <article className={`listing-feed-card market-action-card ${className}`.trim()}>
      {href && (
        <Link href={href} className="ghost-hit-area" aria-label={`View ${title}`} />
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
        {hasDescription && (
          <button
            type="button"
            className="listing-feed-info"
            aria-expanded={showDescription}
            aria-label={`Show ${title} description`}
            onClick={() => setShowDescription((open) => !open)}
          >
            i
          </button>
        )}
      </div>
      {hasDescription && showDescription && (
        <div className="listing-feed-description" role="status">
          {description}
        </div>
      )}
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
