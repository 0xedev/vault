import { NextRequest, NextResponse } from "next/server";
import { resolveHypersnapNames } from "@/lib/hypersnap";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const addresses = (url.searchParams.get("addresses") || "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean)
    .slice(0, 100);

  const data = await resolveHypersnapNames(addresses);
  return NextResponse.json({ data });
}
