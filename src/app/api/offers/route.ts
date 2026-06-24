import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase, shortAddress } from "@/lib/api";
import { forbidden, requireUser } from "@/lib/auth";
import { getEscrowAddress, getPublicClient, readOffer, readOfferCount } from "@/lib/contract";
import { getAddress } from "viem";

const offerSchema = z.object({
  listingId: z.string().min(1),
  offererAddress: z.string().startsWith("0x").length(42).optional(),
  amount: z.number().positive(),
  apr: z.number().min(0).max(100).optional(),
  termDays: z.number().int().positive().optional(),
  expiresInHours: z.number().int().positive().optional().default(24),
  chainId: z.number().int().positive().optional(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

const offerStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["accepted", "rejected"]),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

export async function GET(req: NextRequest) {
  const db = getDatabase();

  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId");
  if (!listingId) return badRequest("listingId is required");
  const chain = url.searchParams.get("chain") === "true";

  if (!db) return databaseRequired();

  const rows = await db`SELECT o.*, l.contract_listing_id FROM offers o JOIN listings l ON l.id = o.listing_id WHERE o.listing_id = ${listingId} ORDER BY o.created_at DESC` as Record<string, unknown>[];
  const data = rows.map((row: Record<string, unknown>) => ({
    id: row.id,
    who: shortAddress(row.offerer_address),
    offererAddress: row.offerer_address,
    amt: Number(row.amount),
    apr: Number(row.apr || 0),
    term: Number(row.term_days || 0),
    when: row.created_at,
    status: row.status,
  }));

  if (chain) {
    const contractListingId = (rows[0] as Record<string, unknown> | undefined)?.contract_listing_id;
    if (contractListingId) {
      try {
        const [count, ...onChainOffers] = await Promise.all([
          readOfferCount(BigInt(String(contractListingId))),
          ...data.map(async (o) => {
            try {
              return await readOffer(BigInt(String(contractListingId)), getAddress(String(o.offererAddress)));
            } catch {
              return null;
            }
          }),
        ]);

        return NextResponse.json({
          data: data.map((o, i) => ({
            ...o,
            onChainApr: onChainOffers[i] ? Number(onChainOffers[i]!.apr) / 100 : null,
            onChainTerm: onChainOffers[i] ? Number(onChainOffers[i]!.term) : null,
          })),
          total: Number(count),
          onChainVerified: true,
        });
      } catch {
        // Chain read failed, return DB data
      }
    }
  }

  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid offer", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = auth.db;
  const id = `O-${Date.now()}`;

  await db`INSERT INTO users (address) VALUES (${auth.user.address}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO offers (id, listing_id, offerer_address, amount, apr, term_days, status, chain_id, tx_hash, tx_status)
    VALUES (${id}, ${parsed.data.listingId}, ${auth.user.address}, ${parsed.data.amount}, ${parsed.data.apr || null}, ${parsed.data.termDays || null}, 'pending', ${parsed.data.chainId || null}, ${parsed.data.txHash || null}, ${parsed.data.txHash ? "pending" : "offchain"})`;

  return NextResponse.json({ data: { id, ...parsed.data, offererAddress: auth.user.address, status: "pending", createdAt: new Date().toISOString() } }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = offerStatusSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Invalid offer status", parsed.error.flatten());

  const db = auth.db;
  const rows = await db`
    SELECT o.id, o.listing_id, o.offerer_address, l.seller_address, l.contract_listing_id, l.contract_address, l.tx_status
    FROM offers o
    JOIN listings l ON l.id = o.listing_id
    WHERE o.id = ${parsed.data.id}
    LIMIT 1
  ` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  const isSeller = String(rows[0].seller_address).toLowerCase() === auth.user.address;
  const isOfferer = String(rows[0].offerer_address).toLowerCase() === auth.user.address;
  const isRejection = parsed.data.status === "rejected";

  if (!isSeller && auth.user.role !== "admin" && !(isOfferer && isRejection)) {
    return forbidden("Only the listing owner (or the offerer to withdraw) can update this offer.");
  }

  const contractBacked = Boolean(rows[0].contract_listing_id || rows[0].contract_address || String(rows[0].tx_status || "") === "pending" || String(rows[0].tx_status || "") === "confirmed");
  if (parsed.data.status === "accepted" && contractBacked) {
    if (!parsed.data.txHash) return NextResponse.json({ error: "A confirmed accept-offer transaction hash is required." }, { status: 400 });
    const receipt = await getPublicClient().getTransactionReceipt({ hash: parsed.data.txHash as `0x${string}` }).catch(() => null);
    if (!receipt) return NextResponse.json({ error: "Accept-offer transaction is not confirmed yet." }, { status: 400 });
    if (receipt.status !== "success") return NextResponse.json({ error: "Accept-offer transaction failed." }, { status: 400 });
    if (receipt.to?.toLowerCase() !== getEscrowAddress().toLowerCase()) {
      return NextResponse.json({ error: "Transaction was not sent to the configured escrow contract." }, { status: 400 });
    }
  }

  await db`UPDATE offers SET status = ${parsed.data.status}, tx_hash = COALESCE(${parsed.data.txHash || null}, tx_hash), tx_status = CASE WHEN ${parsed.data.txHash || null} IS NULL THEN tx_status ELSE 'confirmed' END WHERE id = ${parsed.data.id}`;
  if (parsed.data.status === "accepted") {
    await db`UPDATE listings SET status = 'funded', updated_at = NOW() WHERE id = ${rows[0].listing_id}`;
  }
  return NextResponse.json({ data: parsed.data });
}
