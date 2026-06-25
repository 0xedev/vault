import { NextRequest, NextResponse } from "next/server";
import { verifyFarcasterSiwfSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    return await verifyFarcasterSiwfSession(req);
  } catch (err) {
    console.error("[api/auth/farcaster] verification failed", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
}
