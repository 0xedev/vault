import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase } from "@/lib/api";
import { mapClankerListing, mapFarcasterListing, mapLoanListing, mapMiniAppListing, mapXAccountListing, mapBundleListing } from "@/lib/marketplace";
import { actorAddressForRequest, requireUser } from "@/lib/auth";
import { verifyClankerTokenOwnership } from "@/lib/clanker";
import { activeListingContractAddress } from "@/lib/listing-contracts";

const walletAddressSchema = z.string().startsWith("0x").length(42);

const dbKindMap: Record<string, string> = {
  "nft-loans": "nft_loan",
  "mini-apps": "mini_app",
  "x-accounts": "x_account",
  farcaster: "farcaster",
  clanker: "clanker",
  bundles: "bundle",
};

export const marketplaceListingSchema = z.object({
  sellerAddress: z.string().startsWith("0x").length(42).optional(),
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  price: z.number().positive(),
  data: z.record(z.string(), z.unknown()).default({}),
  chainId: z.number().int().positive().optional(),
  contractAddress: z.string().startsWith("0x").optional(),
  contractListingId: z.string().optional(),
  txHash: z.string().startsWith("0x").optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const db = getDatabase();
  if (!db) return databaseRequired();

  const dbKind = dbKindMap[kind];
  if (!dbKind) return NextResponse.json({ error: "Unknown marketplace kind" }, { status: 404 });
  const activeContract = await activeListingContractAddress(dbKind);
  const url = new URL(req.url);
  const sellerAddressParam = url.searchParams.get("sellerAddress");
  const parsedSellerAddress = sellerAddressParam ? walletAddressSchema.safeParse(sellerAddressParam) : null;
  const sellerAddress = parsedSellerAddress?.success ? parsedSellerAddress.data.toLowerCase() : "";

  let rows: Record<string, unknown>[];

  if (dbKind === "bundle") {
    rows = sellerAddress
      ? await db`
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
        AND lower(l.seller_address) = ${sellerAddress}
        AND lower(l.contract_address) = ${activeContract}
        AND l.contract_listing_id IS NOT NULL
      GROUP BY l.id
      ORDER BY l.created_at DESC
    ` as Record<string, unknown>[]
      : await db`
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
        AND lower(l.contract_address) = ${activeContract}
      GROUP BY l.id
      ORDER BY l.created_at DESC
    ` as Record<string, unknown>[];
  } else {
    rows = sellerAddress
      ? await db`SELECT * FROM listings WHERE marketplace = ${dbKind} AND moderation_status = 'approved' AND status <> 'cancelled' AND lower(seller_address) = ${sellerAddress} AND lower(contract_address) = ${activeContract} AND contract_listing_id IS NOT NULL ORDER BY created_at DESC` as Record<string, unknown>[]
      : await db`SELECT * FROM listings WHERE marketplace = ${dbKind} AND moderation_status = 'approved' AND status <> 'cancelled' AND lower(contract_address) = ${activeContract} ORDER BY created_at DESC` as Record<string, unknown>[];
  }

  const data =
    kind === "nft-loans" ? rows.map(mapLoanListing) :
    kind === "mini-apps" ? rows.map(mapMiniAppListing) :
    kind === "x-accounts" ? rows.map(mapXAccountListing) :
    kind === "clanker" ? rows.map(mapClankerListing) :
    kind === "bundles" ? rows.map(mapBundleListing) :
    rows.map(mapFarcasterListing);

  return NextResponse.json({ data, total: data.length });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const { kind } = await params;
  const dbKind = dbKindMap[kind];
  if (!dbKind || kind === "nft-loans") return NextResponse.json({ error: kind === "nft-loans" ? "Use /api/listings for NFT loans" : "Unknown marketplace kind" }, { status: 404 });

  const parsed = marketplaceListingSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid marketplace listing", parsed.error.flatten());

  const db = auth.db;
  const activeContract = await activeListingContractAddress(dbKind);
  if (!parsed.data.contractAddress || parsed.data.contractAddress.toLowerCase() !== activeContract) {
    return badRequest("Listing must be created against the active Vault escrow contract.");
  }
  const sellerAddress = actorAddressForRequest(auth.user, parsed.data.sellerAddress);
  if (kind === "clanker") {
    const tokenAddress = String(parsed.data.data.tokenAddress || "");
    if (!tokenAddress.startsWith("0x") || tokenAddress.length !== 42) {
      return badRequest("A valid Clanker token contract address is required.");
    }

    const ownership = await verifyClankerTokenOwnership(sellerAddress, tokenAddress);
    if (!ownership.verified) {
      return NextResponse.json({ error: ownership.reason || "This wallet cannot list that Clanker token." }, { status: 403 });
    }
  }

  const idPrefix = kind === "mini-apps" ? "M" : kind === "x-accounts" ? "X" : kind === "clanker" ? "C" : "F";
  const id = `${idPrefix}-${Date.now()}`;
  const data = JSON.stringify(parsed.data.data);

  await db`INSERT INTO users (address) VALUES (${sellerAddress}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO listings (id, seller_address, marketplace, title, description, price, collateral_data, status, moderation_status, chain_id, contract_address, contract_listing_id, tx_hash, tx_status)
    VALUES (${id}, ${sellerAddress}, ${dbKind}, ${parsed.data.title}, ${parsed.data.description || null}, ${parsed.data.price}, ${data}, 'active', 'approved', ${parsed.data.chainId || null}, ${parsed.data.contractAddress || null}, ${parsed.data.contractListingId || null}, ${parsed.data.txHash || null}, ${parsed.data.txHash ? "pending" : "offchain"})`;

  return NextResponse.json({ data: { id, status: "active" } }, { status: 201 });
}
