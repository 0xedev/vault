import { NextRequest, NextResponse } from "next/server";
import { databaseRequired, getDatabase } from "@/lib/api";
import { mapLoanListing } from "@/lib/marketplace";
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
