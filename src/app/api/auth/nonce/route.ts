import { NextResponse } from "next/server";
import { createNonce } from "@/lib/auth";

export async function GET() {
  const result = await createNonce();
  if ("response" in result) return result.response;
  return NextResponse.json({ nonce: result.nonce });
}
