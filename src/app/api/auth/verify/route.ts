import { NextRequest, NextResponse } from "next/server";
import { verifySiweSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    return await verifySiweSession(req);
  } catch (err) {
    console.error("[api/auth/verify] verification failed", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
}
