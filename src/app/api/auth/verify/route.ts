import { NextRequest, NextResponse } from "next/server";
import { verifySiweSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    return await verifySiweSession(req);
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
}
