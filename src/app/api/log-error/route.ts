import { NextRequest, NextResponse } from "next/server";
import { csrfCheck } from "@/lib/security";

export async function POST(req: NextRequest) {
  const guard = csrfCheck(req);
  if (guard.status !== 200) return guard;

  try {
    const body = await req.json();
    const label = typeof body.label === "string" ? body.label : "client-error";
    const error = body.error ?? "undefined";
    const extra = body.extra ?? {};
    console.error(`[client:${label}]`, error, extra);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
