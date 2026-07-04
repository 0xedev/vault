import type { Metadata } from "next";
import { asString } from "@/lib/api";
import { activeListingContractAddress } from "@/lib/listing-contracts";
import {
  mapBundleListing,
  mapClankerListing,
  mapFarcasterListing,
  mapLoanListing,
  mapMiniAppListing,
  mapXAccountListing,
  type ListingRow,
} from "@/lib/marketplace";
import { getDatabase } from "@/lib/api";
import { fmtFarcasterAccount } from "@/lib/utils";

export const SITE_URL = "https://baseshirehethaway.com";
export const DEFAULT_IMAGE_URL = `${SITE_URL}/logo.png`;

export type ListingShareKind =
  | "nft"
  | "miniapps"
  | "x"
  | "farcaster"
  | "clanker"
  | "bundles";

export type ListingShareData = {
  id: string;
  kind: ListingShareKind;
  title: string;
  subtitle: string;
  priceLabel: string;
  imageUrl: string;
  pageUrl: string;
  details: { label: string; value: string }[];
};

type ListingKindConfig = {
  marketplace: string;
  routePath: string;
  fallbackTitle: string;
  fallbackDescription: string;
};

const configs: Record<ListingShareKind, ListingKindConfig> = {
  nft: {
    marketplace: "nft_loan",
    routePath: "/detail",
    fallbackTitle: "NFT loans on Baseshire Hethaway",
    fallbackDescription: "Browse NFT-backed loan listings on Baseshire Hethaway.",
  },
  miniapps: {
    marketplace: "mini_app",
    routePath: "/miniapps",
    fallbackTitle: "Mini Apps for sale on Baseshire Hethaway",
    fallbackDescription: "Browse Mini App and on-chain project listings on Baseshire Hethaway.",
  },
  x: {
    marketplace: "x_account",
    routePath: "/x",
    fallbackTitle: "X accounts for sale on Baseshire Hethaway",
    fallbackDescription: "Browse X account listings with escrow protection.",
  },
  farcaster: {
    marketplace: "farcaster",
    routePath: "/farcaster",
    fallbackTitle: "Farcaster FIDs for sale on Baseshire Hethaway",
    fallbackDescription: "Browse Farcaster account listings with escrow protection.",
  },
  clanker: {
    marketplace: "clanker",
    routePath: "/clanker",
    fallbackTitle: "Clanker tokens for sale on Baseshire Hethaway",
    fallbackDescription: "Browse Clanker token listings with escrow protection.",
  },
  bundles: {
    marketplace: "bundle",
    routePath: "/market",
    fallbackTitle: "Bundled listings on Baseshire Hethaway",
    fallbackDescription: "Browse bundled digital asset listings on Baseshire Hethaway.",
  },
};

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function absoluteUrl(value: string | undefined) {
  if (!value) return DEFAULT_IMAGE_URL;
  try {
    const url = new URL(value, SITE_URL);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : DEFAULT_IMAGE_URL;
  } catch {
    return DEFAULT_IMAGE_URL;
  }
}

export function pageUrlForListing(kind: ListingShareKind, id?: string) {
  const config = configs[kind];
  const url = new URL(config.routePath, SITE_URL);
  if (kind === "bundles") url.searchParams.set("tab", "bundles");
  if (id) url.searchParams.set("id", id);
  return url.toString();
}

export function listingOgImageUrl(kind: ListingShareKind, id?: string) {
  const url = new URL("/api/og/listing", SITE_URL);
  url.searchParams.set("kind", kind);
  if (id) url.searchParams.set("id", id);
  return url.toString();
}

export function miniAppEmbed({
  imageUrl = DEFAULT_IMAGE_URL,
  launchUrl = SITE_URL,
  buttonTitle = "Browse marketplace",
}: {
  imageUrl?: string;
  launchUrl?: string;
  buttonTitle?: string;
}) {
  return JSON.stringify({
    version: "1",
    imageUrl,
    button: {
      title: buttonTitle,
      action: {
        type: "launch_frame",
        name: "Baseshire Hethaway",
        url: launchUrl,
        splashImageUrl: DEFAULT_IMAGE_URL,
        splashBackgroundColor: "#0052ff",
      },
    },
  });
}

function priceLabel(value: unknown, currency = "USDC") {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return "";
  return `${price.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
}

function compact(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value || "0");
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function joinValues(values: unknown[], fallback = "Included") {
  const text = values.map(String).filter(Boolean).slice(0, 2).join(", ");
  return text || fallback;
}

function shareDataForRow(
  kind: ListingShareKind,
  row: ListingRow,
): ListingShareData {
  if (kind === "nft") {
    const listing = mapLoanListing(row);
    return {
      id: listing.id,
      kind,
      title: `${listing.collection} ${listing.token}`.trim(),
      subtitle: `${listing.amt} USDC loan at ${listing.apr}% APR`,
      priceLabel: priceLabel(listing.amt),
      imageUrl: absoluteUrl(listing.imageUrl),
      pageUrl: pageUrlForListing(kind, listing.id),
      details: [
        { label: "Principal", value: priceLabel(listing.amt) },
        { label: "APR", value: `${listing.apr}%` },
        { label: "Term", value: `${listing.term}d` },
      ],
    };
  }

  if (kind === "miniapps") {
    const listing = mapMiniAppListing(row);
    return {
      id: listing.id,
      kind,
      title: listing.name,
      subtitle: `${listing.kind} · ${listing.dau.toLocaleString()} DAU · ${listing.mrr} USDC MRR`,
      priceLabel: priceLabel(listing.price),
      imageUrl: absoluteUrl(listing.imageUrl),
      pageUrl: pageUrlForListing(kind, listing.id),
      details: [
        { label: "DAU", value: compact(listing.dau) },
        { label: "MRR", value: priceLabel(listing.mrr) },
        { label: "Stack", value: joinValues(listing.stack, listing.kind) },
        {
          label: "Assets",
          value: joinValues(listing.includes || [], listing.source ? "Source included" : "Negotiable"),
        },
      ],
    };
  }

  if (kind === "x") {
    const listing = mapXAccountListing(row);
    return {
      id: listing.id,
      kind,
      title: listing.handle,
      subtitle: `${listing.followers.toLocaleString()} followers · ${listing.engagement}% engagement`,
      priceLabel: priceLabel(listing.price),
      imageUrl: absoluteUrl(listing.imageUrl),
      pageUrl: pageUrlForListing(kind, listing.id),
      details: [
        { label: "Followers", value: compact(listing.followers) },
        { label: "Niche", value: listing.niche || "General" },
        { label: "Engagement", value: `${listing.engagement}%` },
        { label: "Posts / 30d", value: compact(listing.posts_30d) },
      ],
    };
  }

  if (kind === "farcaster") {
    const listing = mapFarcasterListing(row);
    return {
      id: listing.id,
      kind,
      title: fmtFarcasterAccount(listing),
      subtitle: `FID #${listing.fid} · ${listing.followers.toLocaleString()} followers`,
      priceLabel: priceLabel(listing.price),
      imageUrl: absoluteUrl(listing.imageUrl),
      pageUrl: pageUrlForListing(kind, listing.id),
      details: [
        { label: "FID", value: `#${listing.fid}` },
        { label: "Followers", value: compact(listing.followers) },
        { label: "Casts / 30d", value: compact(listing.casts_30d) },
        {
          label: "Channel",
          value: listing.channel || (listing.power_badge ? "Power badge" : "General"),
        },
      ],
    };
  }

  if (kind === "clanker") {
    const listing = mapClankerListing(row);
    return {
      id: listing.id,
      kind,
      title: `${listing.name} (${listing.symbol})`,
      subtitle: `${listing.chain} · ${listing.totalSupply.toLocaleString()} supply`,
      priceLabel: priceLabel(listing.price),
      imageUrl: absoluteUrl(listing.imageUrl),
      pageUrl: pageUrlForListing(kind, listing.id),
      details: [
        { label: "Symbol", value: listing.symbol || "Token" },
        { label: "Supply", value: compact(listing.totalSupply) },
        { label: "Remaining", value: compact(listing.remainingSupply) },
        { label: "Fees", value: priceLabel(listing.feeEarnings) || "Included" },
      ],
    };
  }

  const listing = mapBundleListing(row);
  return {
    id: listing.id,
    kind,
    title: listing.name,
    subtitle:
      listing.description ||
      `${listing.assets.length} assets · ${listing.currency || "USDC"}`,
    priceLabel: priceLabel(listing.totalPrice, listing.currency),
    imageUrl: absoluteUrl(listing.imageUrl),
    pageUrl: pageUrlForListing(kind, listing.id),
    details: [
      { label: "Assets", value: String(listing.assets.length) },
      {
        label: "Includes",
        value: joinValues(
          listing.assets.map((asset) => asset.label),
          "Multiple assets",
        ),
      },
      { label: "Currency", value: listing.currency || "USDC" },
      { label: "Listed", value: listing.createdAt ? new Date(listing.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Live" },
    ],
  };
}

export function fallbackShareData(kind: ListingShareKind): ListingShareData {
  const config = configs[kind];
  return {
    id: "",
    kind,
    title: config.fallbackTitle,
    subtitle: config.fallbackDescription,
    priceLabel: "",
    imageUrl: DEFAULT_IMAGE_URL,
    pageUrl: pageUrlForListing(kind),
    details: [
      { label: "Market", value: "Live" },
      { label: "Escrow", value: "On-chain" },
      { label: "Settlement", value: "USDC" },
      { label: "Network", value: "Base" },
    ],
  };
}

export async function getListingShareData(
  kind: ListingShareKind,
  id: string | undefined,
): Promise<ListingShareData | null> {
  if (!id) return null;
  const db = getDatabase();
  if (!db) return null;
  const config = configs[kind];

  try {
    const activeContract = await activeListingContractAddress(config.marketplace);
    const rows =
      kind === "bundles"
        ? ((await db`
            SELECT
              l.*,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'id', la.id,
                    'assetType', la.asset_type,
                    'assetData', la.asset_data,
                    'position', la.position
                  ) ORDER BY la.position
                ) FILTER (WHERE la.id IS NOT NULL),
                '[]'::jsonb
              ) AS listing_assets_data
            FROM listings l
            LEFT JOIN listing_assets la ON la.listing_id = l.id
            WHERE l.id = ${id}
              AND l.marketplace = ${config.marketplace}
              AND l.moderation_status = 'approved'
              AND l.status <> 'cancelled'
              AND lower(l.contract_address) = ${activeContract}
            GROUP BY l.id
            LIMIT 1
          `) as ListingRow[])
        : ((await db`
            SELECT *
            FROM listings
            WHERE id = ${id}
              AND marketplace = ${config.marketplace}
              AND moderation_status = 'approved'
              AND status <> 'cancelled'
              AND lower(contract_address) = ${activeContract}
            LIMIT 1
          `) as ListingRow[]);

    return rows[0] ? shareDataForRow(kind, rows[0]) : null;
  } catch {
    return null;
  }
}

export async function listingMetadata({
  kind,
  id,
}: {
  kind: ListingShareKind;
  id?: string;
}): Promise<Metadata> {
  const listing = await getListingShareData(kind, id);
  const data = listing || fallbackShareData(kind);
  const imageUrl = listingOgImageUrl(kind, listing?.id);
  const title = data.title;
  const description =
    data.priceLabel && listing
      ? `${data.subtitle} · ${data.priceLabel}`
      : data.subtitle;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: data.pageUrl,
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    other: {
      "fc:miniapp": miniAppEmbed({
        imageUrl,
        launchUrl: data.pageUrl,
        buttonTitle: listing ? "View listing" : "Browse marketplace",
      }),
    },
  };
}

export function listingKindFromSearchTab(value: unknown): ListingShareKind {
  const tab = asString(value);
  if (tab === "bundles") return "bundles";
  if (tab === "clanker") return "clanker";
  if (tab === "farcaster") return "farcaster";
  if (tab === "x") return "x";
  if (tab === "miniapps") return "miniapps";
  return "nft";
}
