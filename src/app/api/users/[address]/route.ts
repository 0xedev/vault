import { NextRequest, NextResponse } from "next/server";
import { actorAddressForRequest, isEvmAddress, requireUser } from "@/lib/auth";
import { readUserActivities, readUserProfile } from "@/lib/contract-reads";
import { fetchIndexedUserProfile } from "@/lib/subgraph";

const USDC_DECIMALS = 1_000_000;

function bigintString(value: bigint | undefined) {
  return value == null ? "0" : value.toString();
}

async function fetchOnchainUserProfile(address: string) {
  if (!isEvmAddress(address)) return null;
  const [nftProfile, dealsProfile, nftActivities, dealActivities] = await Promise.allSettled([
    readUserProfile("nft", address),
    readUserProfile("deals", address),
    readUserActivities("nft", address, BigInt(0), BigInt(50)),
    readUserActivities("deals", address, BigInt(0), BigInt(50)),
  ]);
  const nft = nftProfile.status === "fulfilled" ? nftProfile.value : null;
  const deals = dealsProfile.status === "fulfilled" ? dealsProfile.value : null;
  const activities = [
    ...(nftActivities.status === "fulfilled" ? nftActivities.value : []),
    ...(dealActivities.status === "fulfilled" ? dealActivities.value : []),
  ].sort((a, b) => Number(b.timestamp - a.timestamp)).slice(0, 100);

  const lockedUSDC = (nft?.lockedUSDC || BigInt(0)) + (deals?.lockedUSDC || BigInt(0));
  return {
    profile: {
      nftListingCount: bigintString(nft?.nftListingCount),
      dealListingCount: bigintString(deals?.dealListingCount),
      boughtDealCount: bigintString(deals?.boughtDealCount),
      loanOfferCount: bigintString(nft?.loanOfferCount),
      dealOfferCount: bigintString(deals?.dealOfferCount),
      lockedUSDC: lockedUSDC.toString(),
      activeLoanCount: bigintString(nft?.activeLoanCount),
      activeDealCount: bigintString(deals?.activeDealCount),
      lifetimeVolume: ((nft?.lifetimeVolume || BigInt(0)) + (deals?.lifetimeVolume || BigInt(0))).toString(),
      activityCount: ((nft?.activityCount || BigInt(0)) + (deals?.activityCount || BigInt(0))).toString(),
    },
    lockedBalance: Number(lockedUSDC) / USDC_DECIMALS,
    activities: activities.map((activity) => ({
      action: activity.action,
      market: activity.market,
      subjectId: activity.subjectId.toString(),
      actor: activity.actor,
      counterparty: activity.counterparty,
      amount: activity.amount.toString(),
      timestamp: activity.timestamp.toString(),
      status: activity.status,
      metadataHash: activity.metadataHash,
    })),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const url = new URL(req.url);
  const actorAddress = actorAddressForRequest(auth.user, url.searchParams.get("walletAddress"));
  if (auth.user.role !== "admin" && actorAddress !== address.toLowerCase()) {
    return NextResponse.json({ error: "Profile access denied" }, { status: 403 });
  }
  const db = auth.db;
  const normalizedAddress = address.toLowerCase();

  const [indexed, onchain] = await Promise.all([
    fetchIndexedUserProfile(normalizedAddress).catch(() => null),
    fetchOnchainUserProfile(normalizedAddress).catch(() => null),
  ]);
  const rows = await db`SELECT * FROM users WHERE address = ${normalizedAddress}` as Record<string, unknown>[];
  if (rows.length === 0) {
    return NextResponse.json({
      data: {
        address: normalizedAddress,
        trades: indexed?.indexedTrades || 0,
        reputation: 0,
        lockedBalance: Math.max(indexed?.indexedLockedBalance || 0, onchain?.lockedBalance || 0),
        role: "user",
        indexed,
        onchain,
      },
    });
  }

  const u = rows[0];
  return NextResponse.json({
    data: {
      address: u.address,
      trades: Math.max(Number(u.trades || 0), indexed?.indexedTrades || 0),
      reputation: u.reputation,
      lockedBalance: Math.max(Number(u.locked_balance || 0), indexed?.indexedLockedBalance || 0, onchain?.lockedBalance || 0),
      role: u.role,
      indexed,
      onchain,
    },
  });
}
