import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getClankerTokensForOwner } from "@/lib/clanker";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const data = await getClankerTokensForOwner(auth.user.address);
  return NextResponse.json({ data, total: data.length });
}
