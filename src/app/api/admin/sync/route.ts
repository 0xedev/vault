import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { syncEscrowEvents } from "@/lib/sync";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const result = await syncEscrowEvents();
    if ("response" in result) return result.response;
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to sync contract events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
