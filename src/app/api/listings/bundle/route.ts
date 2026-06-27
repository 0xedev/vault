import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase } from "@/lib/api";
import { mapBundleListing } from "@/lib/marketplace";
import type { BundleAsset } from "@/lib/data";
import { actorAddressForRequest, requireUser } from "@/lib/auth";

const bundleAssetSchema = z.object({
  kind: z.enum(["nft_loan", "mini_app", "x_account", "farcaster", "clanker"]),
  label: z.string().min(1),
  detail: z.string().optional().default(""),
  price: z.number().min(0),
  data: z.record(z.string(), z.unknown()).default({}),
});

const bundleListingSchema = z.object({
  id: z.string().min(1).optional(),
  sellerAddress: z.string().startsWith("0x").length(42).optional(),
  name: z.string().min(2, "Bundle name is required"),
  description: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  totalPrice: z.number().positive(),
  assets: z.array(bundleAssetSchema).min(1, "At least one asset is required").max(10, "Maximum 10 assets per bundle"),
  chainId: z.number().int().positive().optional(),
  contractAddress: z.string().startsWith("0x").optional(),
  contractListingId: z.string().optional(),
  txHash: z.string().startsWith("0x").optional(),
});

export async function GET(req: NextRequest) {
  const db = getDatabase();
  if (!db) return databaseRequired();

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const countResult = await db`
    SELECT COUNT(*) AS total FROM listings
    WHERE marketplace = 'bundle'
      AND moderation_status = 'approved'
      AND status <> 'cancelled'
  ` as Record<string, unknown>[];

  const rows = await db`
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
    WHERE l.marketplace = 'bundle'
      AND l.moderation_status = 'approved'
      AND l.status <> 'cancelled'
    GROUP BY l.id
    ORDER BY l.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  ` as Record<string, unknown>[];

  const data = rows.map(mapBundleListing);
  const total = parseInt(String(countResult[0]?.total || "0"));
  return NextResponse.json({ data, total, offset, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = bundleListingSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid bundle listing", parsed.error.flatten());

  const db = auth.db;
  const data = parsed.data;
  const sellerAddress = actorAddressForRequest(auth.user, data.sellerAddress);
  const id = data.id || `B-${Date.now()}`;

  const collateralData = JSON.stringify({
    name: data.name,
    description: data.description,
    imageUrl: data.imageUrl || "",
    assets: data.assets.map((a: z.infer<typeof bundleAssetSchema>, i: number) => ({
      ...a,
      position: i,
    })),
  });

  await db`INSERT INTO users (address) VALUES (${sellerAddress}) ON CONFLICT (address) DO NOTHING`;

  await db`INSERT INTO listings (id, seller_address, marketplace, title, description, price, collateral_data, status, moderation_status, is_bundle, chain_id, contract_address, contract_listing_id, tx_hash, tx_status)
    VALUES (${id}, ${sellerAddress}, 'bundle', ${data.name}, ${data.description || null}, ${data.totalPrice}, ${collateralData}, 'active', 'approved', 'true', ${data.chainId || null}, ${data.contractAddress || null}, ${data.contractListingId || null}, ${data.txHash || null}, ${data.txHash ? "pending" : "offchain"})`;

  for (let i = 0; i < data.assets.length; i++) {
    const asset = data.assets[i];
    const assetId = `A-${id}-${i}`;
    await db`INSERT INTO listing_assets (id, listing_id, asset_type, asset_data, position)
      VALUES (${assetId}, ${id}, ${asset.kind}, ${JSON.stringify(asset)}, ${i})`;

    const method =
      asset.kind === "x_account" ? "x_tweet" :
      asset.kind === "farcaster" ? "farcaster_registry" :
      asset.kind === "clanker" ? "token_ownership" :
      asset.kind === "mini_app" ? "dns" :
      "nft_ownership";
    await db`INSERT INTO verifications (id, marketplace, target, owner_address, method, status, checks)
      VALUES (${`V-${Date.now()}-${i}`}, ${asset.kind}, ${asset.label}, ${sellerAddress}, ${method}, 'pending', ${JSON.stringify([])})`;
  }

  const bundle: BundleAsset[] = data.assets.map((a: z.infer<typeof bundleAssetSchema>, i: number) => ({
    id: `A-${id}-${i}`,
    kind: a.kind,
    label: a.label,
    detail: a.detail || "",
    price: a.price,
    data: a.data,
  }));

  return NextResponse.json({
    data: {
      id,
      name: data.name,
      description: data.description,
      totalPrice: data.totalPrice,
      assets: bundle,
      status: "active",
    },
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const bundleId = url.searchParams.get("id");
  if (!bundleId) return badRequest("Missing bundle id parameter");

  const listing = await auth.db`SELECT * FROM listings WHERE id = ${bundleId} AND seller_address = ${auth.user.address} AND marketplace = 'bundle' LIMIT 1` as Record<string, unknown>[];
  if (listing.length === 0) return NextResponse.json({ error: "Bundle not found or not yours" }, { status: 404 });

  await auth.db`DELETE FROM listing_assets WHERE listing_id = ${bundleId}`;
  await auth.db`UPDATE listings SET status = 'cancelled', updated_at = NOW() WHERE id = ${bundleId}`;

  return NextResponse.json({ data: { id: bundleId, status: "cancelled" } });
}
