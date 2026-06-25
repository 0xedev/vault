import { NextRequest, NextResponse } from "next/server";
import { actorAddressForRequest, requireUser } from "@/lib/auth";
import { getClankerTokensForOwner } from "@/lib/clanker";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const walletParam = req.nextUrl.searchParams.get("wallet") || "";
  const owner = actorAddressForRequest(auth.user, walletParam);
  const data = await getClankerTokensForOwner(owner);
  return NextResponse.json({ data, total: data.length });
}
