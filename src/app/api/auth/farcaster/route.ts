import { NextRequest, NextResponse } from "next/server";
import { createFarcasterQuickAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    return await createFarcasterQuickAuthSession(req);
  } catch (err) {
    console.error("[api/auth/farcaster] sign-in failed", err);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 400 });
  }
}
