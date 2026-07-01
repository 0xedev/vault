import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { databaseRequired, getDatabase } from "@/lib/api";
import { mapDigitalDeal } from "@/lib/marketplace";
import { getDealsAddress, readAllDeals, mapDealStage } from "@/lib/contract";
import { activeListingContractAddress } from "@/lib/listing-contracts";
import { dealListingRowFromSubgraph, fetchIndexedDealListings, mergeIndexedListingRows } from "@/lib/subgraph";

const walletAddressSchema = z.string().startsWith("0x").length(42);

export async function GET(req: NextRequest) {
  const db = getDatabase();
  if (!db) return databaseRequired();
  const activeContract = await activeListingContractAddress("mini_app");
  const indexedContract = (await getDealsAddress()).toLowerCase();
  const url = new URL(req.url);
  const sellerAddressParam = url.searchParams.get("sellerAddress");
  const parsedSellerAddress = sellerAddressParam ? walletAddressSchema.safeParse(sellerAddressParam) : null;
  const sellerAddress = parsedSellerAddress?.success ? parsedSellerAddress.data.toLowerCase() : "";

  let rows = sellerAddress
    ? await db`SELECT * FROM listings WHERE marketplace IN ('mini_app', 'x_account', 'farcaster', 'otc') AND moderation_status = 'approved' AND status <> 'cancelled' AND lower(seller_address) = ${sellerAddress} AND lower(contract_address) = ${activeContract} ORDER BY created_at DESC LIMIT 20` as Record<string, unknown>[]
    : await db`SELECT * FROM listings WHERE marketplace IN ('mini_app', 'x_account', 'farcaster', 'otc') AND moderation_status = 'approved' AND status <> 'cancelled' AND lower(contract_address) = ${activeContract} ORDER BY created_at DESC LIMIT 20` as Record<string, unknown>[];
  try {
    const indexed = await fetchIndexedDealListings({ sellerAddress: sellerAddress || undefined, limit: 100 });
    const indexedRows = indexed
      .filter((listing) => listing.contract.toLowerCase() === indexedContract && listing.status !== "cancelled")
      .flatMap((listing) => {
        const existing = rows.find((row) =>
          String(row.contract_listing_id || "") === listing.dealId
        );
        return [dealListingRowFromSubgraph(listing, existing)];
      });
    rows = mergeIndexedListingRows(rows, indexedRows);
  } catch {
    // Subgraph read failed, return DB data below.
  }
  const data = rows.map(mapDigitalDeal);

  try {
    const onChainDeals = await readAllDeals();
    for (const row of rows) {
      const contractId = String(row.contract_listing_id || "");
      if (!contractId) continue;
      const deal = onChainDeals.find((d) => d.id === BigInt(contractId));
      if (!deal) continue;

      const dbDeal = data.find((d: { id: unknown }) => String(d.id) === String(row.id));
      if (dbDeal && deal) {
        (dbDeal as Record<string, unknown>).onChainStage = mapDealStage(deal.data.stage);
        (dbDeal as Record<string, unknown>).onChainPrice = deal.data.price.toString();
        (dbDeal as Record<string, unknown>).onChainBuyer = deal.data.buyer;
        (dbDeal as Record<string, unknown>).onChainSeller = deal.data.seller;
        (dbDeal as Record<string, unknown>).onChainVerified = true;
      }
    }
  } catch {
    // Chain read failed, return DB data only
  }

  return NextResponse.json({ data, total: data.length });
}
