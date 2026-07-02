import { NextRequest, NextResponse } from "next/server";
import { createFarcasterQuickAuthSession, createFarcasterSignInNonce } from "@/lib/auth";

export async function GET() {
  try {
    const result = await createFarcasterSignInNonce();
    return NextResponse.json({ nonce: result.nonce });
  } catch (err) {
    console.error("[api/auth/farcaster] nonce failed", err);
    return NextResponse.json({ error: "Could not create Farcaster nonce" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await createFarcasterQuickAuthSession(req);
  } catch (err) {
    console.error("[api/auth/farcaster] sign-in failed", err);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 400 });
  }
}
