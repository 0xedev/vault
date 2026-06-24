import { NextRequest, NextResponse } from "next/server";
import { relativeDeadline, shortAddress, stageLabel, asNumber, asString, asBoolean, jsonArray, jsonRecord } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { readDeal, mapDealStage, readDealEscrowBalance } from "@/lib/contract";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireUser(_req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const rows = auth.user.role === "admin"
    ? await db`SELECT e.*, l.marketplace, l.title, l.description, l.price, l.collateral_data, l.is_bundle, l.status AS listing_status FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id WHERE e.id = ${id}` as Record<string, unknown>[]
    : await db`SELECT e.*, l.marketplace, l.title, l.description, l.price, l.collateral_data, l.is_bundle, l.status AS listing_status FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id WHERE e.id = ${id} AND (e.buyer_address = ${auth.user.address} OR e.seller_address = ${auth.user.address})` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const r = rows[0];
  const collateral = jsonRecord(r.collateral_data);
  const isBundle = String(r.is_bundle || "") === "true";
  const listingId = String(r.listing_id || "");

  let bundleAssets: Record<string, unknown>[] = [];
  if (isBundle && listingId) {
    const assetRows = await db`SELECT * FROM listing_assets WHERE listing_id = ${listingId} ORDER BY position` as Record<string, unknown>[];
    bundleAssets = assetRows.map((a) => {
      const ad = typeof a.asset_data === "string" ? JSON.parse(a.asset_data) : a.asset_data as Record<string, unknown>;
      return {
        id: String(a.id),
        kind: String(a.asset_type),
        label: String(ad.label || ad.handle || ad.name || "Item"),
        detail: String(ad.detail || ""),
        position: Number(a.position),
      };
    });
  }

  const escrowDeliverables = jsonArray(r.deliverables || collateral.includes).map(String);
  const includes = escrowDeliverables.length > 0 ? escrowDeliverables : bundleAssets.map((a) => String(a.label));

  const baseData = {
    id: String(r.id),
    kind: String(r.marketplace || "Escrow").replace(/_/g, " "),
    name: asString(r.title, asString(collateral.name, String(r.listing_id || "Unlisted asset"))),
    type: asString(collateral.kind, asString(collateral.type, isBundle ? "Bundle" : "Asset sale")),
    asset: asString(r.title, String(r.listing_id || "Unlisted asset")),
    amount: asNumber(r.amount),
    price: asNumber(r.price, asNumber(r.amount)),
    mrr: asNumber(collateral.mrr),
    currency: asString(r.currency, "ETH"),
    chain: asString(collateral.chain, "Unverified"),
    verified: asBoolean(collateral.verified, String(r.listing_status) === "funded" || String(r.listing_status) === "completed"),
    includes,
    isBundle,
    bundleAssets,
    party: shortAddress(r.buyer_address),
    buyerAddress: String(r.buyer_address || ""),
    sellerAddress: String(r.seller_address || ""),
    deadline: relativeDeadline(r.deadline),
    stage: stageLabel(r.stage),
    stageRaw: String(r.stage || "awaiting_deposit"),
    action: "On schedule",
    listingId,
    chainId: asNumber(r.chain_id),
    contractAddress: asString(r.contract_address),
    contractListingId: asString(r.contract_listing_id),
    txStatus: asString(r.tx_status, "offchain"),
  };

  const contractId = asString(r.contract_listing_id);
  if (contractId) {
    try {
      const [deal, balance] = await Promise.allSettled([
        readDeal(BigInt(contractId)),
        readDealEscrowBalance(BigInt(contractId)),
      ]);

      return NextResponse.json({
        data: {
          ...baseData,
          onChain: {
            verified: true,
            stage: deal.status === "fulfilled" ? mapDealStage(deal.value.stage) : null,
            seller: deal.status === "fulfilled" ? deal.value.seller : null,
            buyer: deal.status === "fulfilled" ? deal.value.buyer : null,
            price: deal.status === "fulfilled" ? deal.value.price.toString() : null,
            deadline: deal.status === "fulfilled" ? Number(deal.value.deadline) : null,
            createdAt: deal.status === "fulfilled" ? Number(deal.value.createdAt) : null,
            buyerAmount: deal.status === "fulfilled" ? deal.value.buyerAmount.toString() : null,
            sellerAmount: deal.status === "fulfilled" ? deal.value.sellerAmount.toString() : null,
            balance: balance.status === "fulfilled" ? balance.value.toString() : null,
          },
        },
      });
    } catch {
      // Chain read failed, return DB data
    }
  }

  return NextResponse.json({ data: baseData });
}
