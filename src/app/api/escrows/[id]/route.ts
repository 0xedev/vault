import { NextRequest, NextResponse } from "next/server";
import { relativeDeadline, shortAddress, stageLabel, asNumber, asString, asBoolean, jsonArray, jsonRecord } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireUser(_req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const rows = auth.user.role === "admin"
    ? await db`SELECT e.*, l.marketplace, l.title, l.description, l.price, l.collateral_data, l.status AS listing_status FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id WHERE e.id = ${id}` as Record<string, unknown>[]
    : await db`SELECT e.*, l.marketplace, l.title, l.description, l.price, l.collateral_data, l.status AS listing_status FROM escrows e LEFT JOIN listings l ON l.id = e.listing_id WHERE e.id = ${id} AND (e.buyer_address = ${auth.user.address} OR e.seller_address = ${auth.user.address})` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });

  const r = rows[0];
  const collateral = jsonRecord(r.collateral_data);

  return NextResponse.json({
    data: {
      id: String(r.id),
      kind: String(r.marketplace || "Escrow").replace(/_/g, " "),
      name: asString(r.title, asString(collateral.name, String(r.listing_id || "Unlisted asset"))),
      type: asString(collateral.kind, asString(collateral.type, "Asset sale")),
      asset: asString(r.title, String(r.listing_id || "Unlisted asset")),
      amount: asNumber(r.amount),
      price: asNumber(r.price, asNumber(r.amount)),
      mrr: asNumber(collateral.mrr),
      currency: asString(r.currency, "ETH"),
      chain: asString(collateral.chain, "Unverified"),
      verified: asBoolean(collateral.verified, String(r.listing_status) === "funded" || String(r.listing_status) === "completed"),
      includes: jsonArray(collateral.includes).map(String),
      party: shortAddress(r.buyer_address),
      buyerAddress: String(r.buyer_address || ""),
      sellerAddress: String(r.seller_address || ""),
      deadline: relativeDeadline(r.deadline),
      stage: stageLabel(r.stage),
      stageRaw: String(r.stage || "awaiting_deposit"),
      action: "On schedule",
      listingId: String(r.listing_id || ""),
      chainId: asNumber(r.chain_id),
      contractAddress: asString(r.contract_address),
      contractListingId: asString(r.contract_listing_id),
      txStatus: asString(r.tx_status, "offchain"),
    },
  });
}
