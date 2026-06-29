import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, databaseRequired, getDatabase } from "@/lib/api";
import { mapLoanListing } from "@/lib/marketplace";
import { actorAddressForRequest, forbidden, requireUser } from "@/lib/auth";
import { readListing, readRepaymentDue, readDeadline, readOfferCount, mapListingStage } from "@/lib/contract";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const chain = url.searchParams.get("chain") === "true";

  // If the listing has a contract ID, try on-chain read first
  if (chain && id.startsWith("C-")) {
    try {
      const listingId = BigInt(id.slice(2));
      const [listing, repayment, deadline, offerCount] = await Promise.allSettled([
        readListing(listingId),
        readRepaymentDue(listingId),
        readDeadline(listingId),
        readOfferCount(listingId),
      ]);

      const onChainData = {
        id,
        borrower: listing.status === "fulfilled" ? (listing as PromiseFulfilledResult<ReturnType<typeof readListing> extends Promise<infer T> ? T : never>).value.borrower : "",
        nftContract: listing.status === "fulfilled" ? listing.value.nftContract : "",
        nftTokenId: listing.status === "fulfilled" ? listing.value.nftTokenId.toString() : "",
        principal: listing.status === "fulfilled" ? listing.value.principal.toString() : "0",
        apr: listing.status === "fulfilled" ? Number(listing.value.apr) / 100 : 0,
        term: listing.status === "fulfilled" ? Number(listing.value.term) : 0,
        acceptedLender: listing.status === "fulfilled" ? listing.value.acceptedLender : "",
        acceptedAmount: listing.status === "fulfilled" ? listing.value.acceptedAmount.toString() : "0",
        fundedAt: listing.status === "fulfilled" ? Number(listing.value.fundedAt) : 0,
        repaidSoFar: listing.status === "fulfilled" ? listing.value.repaidSoFar.toString() : "0",
        stage: listing.status === "fulfilled" ? mapListingStage(listing.value.stage) : "unknown",
        onChain: true,
        ...(repayment.status === "fulfilled" ? {
          totalDue: repayment.value.totalDue.toString(),
          paid: repayment.value.paid.toString(),
          remaining: repayment.value.remaining.toString(),
        } : {}),
        ...(deadline.status === "fulfilled" ? { deadline: Number(deadline.value) } : {}),
        ...(offerCount.status === "fulfilled" ? { offerCount: Number(offerCount.value) } : {}),
      };

      return NextResponse.json({ data: onChainData });
    } catch (err) {
      return NextResponse.json({
        error: "Failed to read from chain",
        detail: err instanceof Error ? err.message : String(err),
      }, { status: 502 });
    }
  }

  // Fallback to database
  const db = getDatabase();
  if (!db) return databaseRequired();

  const rows = await db`SELECT * FROM listings WHERE id = ${id} AND moderation_status = 'approved' AND status <> 'cancelled'` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const data = mapLoanListing(rows[0]);

  // If the listing has a contract_listing_id, also try to enrich with on-chain data
  const contractId = String(rows[0].contract_listing_id || "");
  if (contractId) {
    try {
      const listing = await readListing(BigInt(contractId));
      return NextResponse.json({
        data: {
          ...data,
          onChainStage: mapListingStage(listing.stage),
          onChainBorrower: listing.borrower,
          onChainAcceptedLender: listing.acceptedLender,
          onChainRepaidSoFar: listing.repaidSoFar.toString(),
          onChainVerified: true,
        },
      });
    } catch {
      // Chain read failed, return DB data only
    }
  }

  return NextResponse.json({ data });
}

const patchSchema = z.object({
  status: z.enum(["active", "open", "funded", "completed", "repaid", "default", "disputed", "cancelled"]),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  actorAddress: z.string().optional(),
  action: z.enum(["accept_offer", "repay", "repay_partial", "cancel_listing", "claim_collateral", "sync"]).optional(),
});

function dbStatusForLoanStatus(status: z.infer<typeof patchSchema>["status"]) {
  if (status === "open") return "active";
  if (status === "repaid") return "completed";
  if (status === "default") return "funded";
  return status;
}

function collateralStatusForLoanStatus(status: z.infer<typeof patchSchema>["status"]) {
  if (status === "active") return "open";
  if (status === "completed") return "repaid";
  return status;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const db = auth.db;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid status update", parsed.error.flatten());

  const { status, txHash, action } = parsed.data;
  const actorAddress = actorAddressForRequest(auth.user, parsed.data.actorAddress);

  const rows = await db`SELECT id, seller_address FROM listings WHERE id = ${id} LIMIT 1` as Record<string, unknown>[];
  if (rows.length === 0) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const sellerAddress = String(rows[0].seller_address || "").toLowerCase();
  const isOwner = sellerAddress === actorAddress.toLowerCase();
  let isAcceptedLender = false;

  if (!isOwner && action === "claim_collateral") {
    const offerRows = await db`
      SELECT id FROM offers
      WHERE listing_id = ${id}
        AND offerer_address = ${actorAddress}
        AND status = 'accepted'
      LIMIT 1
    ` as Record<string, unknown>[];
    isAcceptedLender = offerRows.length > 0;
  }

  if (auth.user.role !== "admin" && !isOwner && !isAcceptedLender) {
    return forbidden("Only the listing owner or accepted lender can update this listing.");
  }

  const dbStatus = dbStatusForLoanStatus(status);
  const collateralStatus = collateralStatusForLoanStatus(status);

  await db`UPDATE listings SET
    status = ${dbStatus},
    collateral_data = jsonb_set(COALESCE(collateral_data::jsonb, '{}'::jsonb), '{status}', to_jsonb(${collateralStatus}::text), true),
    tx_hash = COALESCE(${txHash || null}, tx_hash),
    tx_status = CASE WHEN ${txHash || null} IS NULL THEN tx_status ELSE 'confirmed' END,
    updated_at = NOW()
  WHERE id = ${id}`;

  return NextResponse.json({ data: { id, status } });
}
