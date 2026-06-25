import { NextRequest, NextResponse } from "next/server";
import { verifyFarcasterQuickAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    return await verifyFarcasterQuickAuthSession(req);
  } catch (err) {
    console.error("[api/auth/farcaster] verification failed", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
}
