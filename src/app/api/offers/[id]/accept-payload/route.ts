import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";
import { actorAddressForRequest, forbidden, isEvmAddress, requireUser } from "@/lib/auth";

const requestSchema = z.object({
  actorAddress: z.string().startsWith("0x").length(42).optional(),
});

function asString(value: unknown, fallback = "") {
  return value == null ? fallback : String(value);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest("Invalid request", parsed.error.flatten());

  const actorAddress = actorAddressForRequest(auth.user, parsed.data.actorAddress);
  if (auth.user.role !== "admin" && !isEvmAddress(actorAddress)) {
    return forbidden("Link an EVM wallet before accepting an offer.");
  }

  const { id } = await params;
  const rows = await auth.db`
    SELECT
      o.id, o.listing_id, o.offerer_address, o.amount, o.apr, o.term_days,
      o.expires_at, o.offer_type, o.signature, o.nonce, o.typed_data,
      o.marketplace, o.contract_listing_id, o.status, o.chain_id,
      l.seller_address, l.contract_address AS listing_contract_address
    FROM offers o
    JOIN listings l ON l.id = o.listing_id
    WHERE o.id = ${id}
    LIMIT 1
  ` as Record<string, unknown>[];

  if (rows.length === 0) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  const offer = rows[0];
  const isSeller = asString(offer.seller_address).toLowerCase() === actorAddress.toLowerCase();
  if (!isSeller && auth.user.role !== "admin") {
    return forbidden("Only the listing owner or an admin can read accept payloads.");
  }

  if (asString(offer.status) !== "pending") {
    return NextResponse.json({ error: "Offer is not pending" }, { status: 409 });
  }
  if (offer.expires_at && new Date(String(offer.expires_at)).getTime() <= Date.now()) {
    await auth.db`UPDATE offers SET status = 'expired' WHERE id = ${id} AND status = 'pending'`;
    return NextResponse.json({ error: "Offer has expired" }, { status: 409 });
  }
  if (!offer.signature || !offer.nonce || !offer.typed_data) {
    return NextResponse.json({ error: "Offer payload is unavailable" }, { status: 409 });
  }

  return NextResponse.json({
    data: {
      id: offer.id,
      listingId: offer.listing_id,
      offererAddress: offer.offerer_address,
      amount: Number(offer.amount),
      apr: offer.apr == null ? null : Number(offer.apr),
      termDays: offer.term_days == null ? null : Number(offer.term_days),
      expiresAt: offer.expires_at,
      offerType: offer.offer_type || "signed",
      marketplace: offer.marketplace,
      contractListingId: offer.contract_listing_id,
      chainId: offer.chain_id == null ? null : Number(offer.chain_id),
      signature: offer.signature,
      nonce: offer.nonce,
      typedData: offer.typed_data,
    },
  });
}
