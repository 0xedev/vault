import { NextRequest, NextResponse } from "next/server";
import { actorAddressForRequest, requireUser } from "@/lib/auth";
import { verifyClankerTokenOwnership } from "@/lib/clanker";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const contractAddress = req.nextUrl.searchParams.get("contractAddress") || "";
  if (!contractAddress.startsWith("0x") || contractAddress.length !== 42) {
    return NextResponse.json({ error: "A valid token contract address is required." }, { status: 400 });
  }

  const walletParam = req.nextUrl.searchParams.get("wallet") || "";
  const owner = actorAddressForRequest(auth.user, walletParam);
  const result = await verifyClankerTokenOwnership(owner, contractAddress);
  if (!result.verified) {
    return NextResponse.json({ error: result.reason || "Unable to confirm ownership." }, { status: 403 });
  }

  return NextResponse.json({ data: result.token });
}
