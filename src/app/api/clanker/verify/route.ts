import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { verifyClankerTokenOwnership } from "@/lib/clanker";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const contractAddress = req.nextUrl.searchParams.get("contractAddress") || "";
  if (!contractAddress.startsWith("0x") || contractAddress.length !== 42) {
    return NextResponse.json({ error: "A valid token contract address is required." }, { status: 400 });
  }

  const result = await verifyClankerTokenOwnership(auth.user.address, contractAddress);
  if (!result.verified) {
    return NextResponse.json({ error: result.reason || "Unable to verify ownership." }, { status: 403 });
  }

  return NextResponse.json({ data: result.token });
}
