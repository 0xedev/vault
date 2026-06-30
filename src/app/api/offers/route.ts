import { NextRequest, NextResponse } from "next/server";
import { verifyTypedData, type Address } from "viem";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase, jsonArray, jsonRecord, shortAddress } from "@/lib/api";
import { actorAddressForRequest, forbidden, requireUser } from "@/lib/auth";
import { getDealsAddress, getNftAddress, getPublicClient } from "@/lib/contract";
import { copyListingMessagesToDeal } from "@/lib/listing-messages";
import {
  buildSignedDealOfferTypedData,
  buildSignedLoanOfferTypedData,
} from "@/lib/signed-offers";

type OffersDb = NonNullable<ReturnType<typeof getDatabase>>;

let signedOffersSchemaPromise: Promise<void> | null = null;

const offerSchema = z.object({
  listingId: z.string().min(1),
  offererAddress: z.string().startsWith("0x").length(42).optional(),
  amount: z.number().positive(),
  apr: z.number().min(0).max(100).optional(),
  termDays: z.number().int().positive().optional(),
  expiresInHours: z.number().int().positive().optional().default(24),
  expiry: z.string().optional(),
  nonce: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  chainId: z.number().int().positive().optional().default(8453),
});

const offerStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["accepted", "rejected", "cancelled"]),
  actorAddress: z.string().startsWith("0x").length(42).optional(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

function asString(value: unknown, fallback = "") {
  return value == null ? fallback : String(value);
}

function expiryFrom(data: z.infer<typeof offerSchema>) {
  if (data.expiry) return BigInt(data.expiry);
  return BigInt(Math.floor(Date.now() / 1000) + data.expiresInHours * 60 * 60);
}

function offerKind(marketplace: string) {
  return marketplace === "nft_loan" ? "nft_loan" : "deal";
}

function ensureSignedOffersSchema(db: OffersDb) {
  signedOffersSchemaPromise ||= (async () => {
    await db`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "offer_type" text DEFAULT 'signed' NOT NULL`;
    await db`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "signature" text`;
    await db`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "nonce" text`;
    await db`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "typed_data" jsonb`;
    await db`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "marketplace" text`;
    await db`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "contract_listing_id" text`;
  })().catch((err) => {
    signedOffersSchemaPromise = null;
    throw err;
  });
  return signedOffersSchemaPromise;
}

async function targetContract(marketplace: string, rowContract?: unknown) {
  const stored = asString(rowContract);
  if (stored.startsWith("0x")) return stored as Address;
  return marketplace === "nft_loan" ? getNftAddress() : getDealsAddress();
}

async function buildTypedDataForListing(args: {
  listing: Record<string, unknown>;
  offererAddress: Address;
  amount: number;
  apr?: number;
  termDays?: number;
  expiry: bigint;
  nonce: bigint;
  chainId: number;
}) {
  const marketplace = asString(args.listing.marketplace);
  const contractListingId = asString(args.listing.contract_listing_id);
  if (!contractListingId) throw new Error("Listing is pending chain sync.");
  const verifyingContract = await targetContract(marketplace, args.listing.contract_address);
  if (offerKind(marketplace) === "nft_loan") {
    return buildSignedLoanOfferTypedData({
      verifyingContract,
      chainId: args.chainId,
      listingId: contractListingId,
      lender: args.offererAddress,
      amount: args.amount,
      apr: args.apr || 0,
      termDays: args.termDays || 1,
      expiry: args.expiry,
      nonce: args.nonce,
    });
  }
  return buildSignedDealOfferTypedData({
    verifyingContract,
    chainId: args.chainId,
    dealId: contractListingId,
    buyer: args.offererAddress,
    amount: args.amount,
    expiry: args.expiry,
    nonce: args.nonce,
  });
}

export async function GET(req: NextRequest) {
  const db = getDatabase();
  if (!db) return databaseRequired();
  await ensureSignedOffersSchema(db);

  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId");
  const offererAddress = url.searchParams.get("offererAddress");
  if (!listingId && !offererAddress) return badRequest("listingId or offererAddress is required");

  await db`UPDATE offers SET status = 'expired' WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < NOW()`;

  const rows = listingId
    ? await db`
      SELECT o.*, l.marketplace, l.contract_listing_id AS listing_contract_id
      FROM offers o JOIN listings l ON l.id = o.listing_id
      WHERE o.listing_id = ${listingId}
      ORDER BY o.created_at DESC
    ` as Record<string, unknown>[]
    : await db`
      SELECT o.*, l.marketplace, l.contract_listing_id AS listing_contract_id
      FROM offers o JOIN listings l ON l.id = o.listing_id
      WHERE lower(o.offerer_address) = ${String(offererAddress).toLowerCase()}
      ORDER BY o.created_at DESC
    ` as Record<string, unknown>[];

  const data = rows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    who: shortAddress(row.offerer_address),
    offererAddress: row.offerer_address,
    amt: Number(row.amount),
    apr: Number(row.apr || 0),
    term: Number(row.term_days || 0),
    when: row.created_at,
    expiresAt: row.expires_at,
    status: row.status,
    offerType: row.offer_type || "signed",
    signature: row.signature,
    nonce: row.nonce,
    typedData: row.typed_data,
    marketplace: row.marketplace,
    contractListingId: row.contract_listing_id || row.listing_contract_id,
  }));

  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = offerSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid offer", parsed.error.flatten());

  const db = auth.db;
  await ensureSignedOffersSchema(db);
  const listingRows = await db`SELECT * FROM listings WHERE id = ${parsed.data.listingId} AND status = 'active' LIMIT 1` as Record<string, unknown>[];
  if (listingRows.length === 0) return NextResponse.json({ error: "Listing not found or not active" }, { status: 404 });

  const offererAddress = actorAddressForRequest(auth.user, parsed.data.offererAddress) as Address;
  const sellerAddress = asString(listingRows[0].seller_address).toLowerCase();
  if (offererAddress.toLowerCase() === sellerAddress) {
    return NextResponse.json({ error: "You cannot offer on your own listing." }, { status: 400 });
  }

  const expiry = expiryFrom(parsed.data);
  const nonce = BigInt(parsed.data.nonce);
  if (expiry <= BigInt(Math.floor(Date.now() / 1000))) {
    return NextResponse.json({ error: "Offer expiry must be in the future." }, { status: 400 });
  }

  let typedData;
  try {
    typedData = await buildTypedDataForListing({
      listing: listingRows[0],
      offererAddress,
      amount: parsed.data.amount,
      apr: parsed.data.apr,
      termDays: parsed.data.termDays,
      expiry,
      nonce,
      chainId: parsed.data.chainId || 8453,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to build offer typed data" }, { status: 400 });
  }

  const valid = await verifyTypedData({
    address: offererAddress,
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
    signature: parsed.data.signature as `0x${string}`,
  } as Parameters<typeof verifyTypedData>[0]);
  if (!valid) return NextResponse.json({ error: "Invalid offer signature." }, { status: 400 });

  const id = `O-${Date.now()}`;
  const expiresAt = new Date(Number(expiry) * 1000);
  const typedDataJson = JSON.stringify(typedData, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );

  await db`INSERT INTO users (address) VALUES (${offererAddress}) ON CONFLICT (address) DO NOTHING`;
  await db`
    INSERT INTO offers (
      id, listing_id, offerer_address, amount, apr, term_days, expires_at,
      offer_type, signature, nonce, typed_data, marketplace, contract_listing_id,
      status, chain_id, tx_hash, tx_status
    )
    VALUES (
      ${id}, ${parsed.data.listingId}, ${offererAddress}, ${parsed.data.amount},
      ${parsed.data.apr || null}, ${parsed.data.termDays || null}, ${expiresAt},
      'signed', ${parsed.data.signature}, ${parsed.data.nonce}, ${typedDataJson},
      ${asString(listingRows[0].marketplace)}, ${asString(listingRows[0].contract_listing_id)},
      'pending', ${parsed.data.chainId || 8453}, null, 'offchain'
    )
  `;

  return NextResponse.json({
    data: {
      id,
      ...parsed.data,
      offererAddress,
      expiry: expiry.toString(),
      expiresAt: expiresAt.toISOString(),
      typedData: JSON.parse(typedDataJson),
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = offerStatusSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid offer status", parsed.error.flatten());
  const actorAddress = actorAddressForRequest(auth.user, parsed.data.actorAddress);

  const db = auth.db;
  await ensureSignedOffersSchema(db);
  const rows = await db`
    SELECT o.*, l.seller_address, l.marketplace, l.contract_address AS listing_contract_address, l.title, l.price, l.collateral_data, l.is_bundle
    FROM offers o
    JOIN listings l ON l.id = o.listing_id
    WHERE o.id = ${parsed.data.id}
    LIMIT 1
  ` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  const row = rows[0];
  const marketplace = asString(row.marketplace);
  const isSeller = asString(row.seller_address).toLowerCase() === actorAddress.toLowerCase();
  const isOfferer = asString(row.offerer_address).toLowerCase() === actorAddress.toLowerCase();
  const isCancel = parsed.data.status === "cancelled";
  const isReject = parsed.data.status === "rejected";

  if (!isSeller && auth.user.role !== "admin" && !(isOfferer && isCancel)) {
    return forbidden("Only the listing owner can accept/reject, and only the offerer can cancel.");
  }
  if (isReject && !isSeller && auth.user.role !== "admin") {
    return forbidden("Only the listing owner can reject an offer.");
  }

  if (parsed.data.status === "accepted") {
    if (!parsed.data.txHash) return NextResponse.json({ error: "A confirmed accept-offer transaction hash is required." }, { status: 400 });
    const receipt = await getPublicClient().getTransactionReceipt({ hash: parsed.data.txHash as `0x${string}` }).catch(() => null);
    if (!receipt) return NextResponse.json({ error: "Accept-offer transaction is not confirmed yet." }, { status: 400 });
    if (receipt.status !== "success") return NextResponse.json({ error: "Accept-offer transaction failed." }, { status: 400 });
    const expectedTarget = await targetContract(marketplace, row.listing_contract_address);
    if (receipt.to?.toLowerCase() !== expectedTarget.toLowerCase()) {
      return NextResponse.json({ error: "Transaction was not sent to the configured offer contract." }, { status: 400 });
    }
  }

  await db`
    UPDATE offers SET
      status = ${parsed.data.status},
      tx_hash = COALESCE(${parsed.data.txHash || null}, tx_hash),
      tx_status = CASE WHEN ${parsed.data.txHash || null} IS NULL THEN tx_status ELSE 'confirmed' END
    WHERE id = ${parsed.data.id}
  `;

  if (parsed.data.status === "accepted") {
    await db`
      UPDATE listings SET
        status = 'funded',
        collateral_data = jsonb_set(COALESCE(collateral_data::jsonb, '{}'::jsonb), '{status}', '"funded"'::jsonb, true),
        updated_at = NOW()
      WHERE id = ${row.listing_id}
    `;

    if (offerKind(marketplace) === "deal") {
      const existing = await db`SELECT id FROM escrows WHERE listing_id = ${row.listing_id} AND buyer_address = ${row.offerer_address} LIMIT 1` as Record<string, unknown>[];
      if (existing.length === 0) {
        const escrowId = `E-${Date.now()}`;
        let deliverables: string[] = [];
        if (String(row.is_bundle || "") === "true") {
          const assets = await db`SELECT * FROM listing_assets WHERE listing_id = ${row.listing_id} ORDER BY position` as Record<string, unknown>[];
          deliverables = assets.map((asset) => {
            const data = jsonRecord(asset.asset_data);
            return `[${String(asset.asset_type).replace(/_/g, " ")}] ${asString(data.label || data.handle || data.name, "Item")}`;
          });
        } else {
          const data = jsonRecord(row.collateral_data);
          deliverables = jsonArray(data.includes).map(String);
        }
        await db`
          INSERT INTO escrows (
            id, listing_id, buyer_address, seller_address, amount, currency, stage,
            chain_id, contract_address, contract_listing_id, tx_hash, tx_status, deliverables
          )
          VALUES (
            ${escrowId}, ${row.listing_id}, ${row.offerer_address}, ${row.seller_address},
            ${Number(row.amount)}, 'USDC', 'funds_locked',
            ${row.chain_id || 8453}, ${await targetContract(marketplace, row.listing_contract_address)},
            ${row.contract_listing_id}, ${parsed.data.txHash || null}, 'confirmed',
            ${deliverables.length > 0 ? JSON.stringify(deliverables) : null}
          )
        `;
        await copyListingMessagesToDeal({
          db,
          listingId: asString(row.listing_id),
          buyerAddress: asString(row.offerer_address),
          escrowId,
        });
      }
    }
  }

  return NextResponse.json({ data: parsed.data });
}
