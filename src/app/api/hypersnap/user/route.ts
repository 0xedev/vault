import { NextRequest, NextResponse } from "next/server";
import { lookupHypersnapUserByFid } from "@/lib/hypersnap";

export async function GET(req: NextRequest) {
  const fid = Number(new URL(req.url).searchParams.get("fid"));
  if (!Number.isInteger(fid) || fid <= 0) {
    return NextResponse.json({ error: "A valid FID is required" }, { status: 400 });
  }

  const user = await lookupHypersnapUserByFid(fid);
  if (!user) return NextResponse.json({ error: "FID not found" }, { status: 404 });

  return NextResponse.json({
    data: {
      fid: user.fid || fid,
      username: user.username || "",
      displayName: user.display_name || "",
      imageUrl: user.pfp_url || "",
      followers: Number(user.follower_count || 0),
      powerBadge: Boolean(user.power_badge),
    },
  });
}
