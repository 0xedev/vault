import { NextRequest, NextResponse } from "next/server";
import { createNonce, createSiweSession } from "@/lib/auth";

export async function GET() {
  const result = await createNonce();
  if ("response" in result) return result.response;
  return NextResponse.json({ nonce: result.nonce });
}

export async function POST(req: NextRequest) {
  try {
    return await createSiweSession(req);
  } catch {
    return NextResponse.json({ error: "Sign-in failed" }, { status: 400 });
  }
}
