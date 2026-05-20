import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/api";

export async function writeAudit(action: string, target: string, note?: string, actor = "admin", actorAddress?: string, txHash?: string) {
  const db = getDatabase();
  if (!db) return;
  await db`INSERT INTO audit_logs (id, actor, actor_address, action, target, note, tx_hash)
    VALUES (${`A-${Date.now()}-${Math.random().toString(16).slice(2)}`}, ${actor}, ${actorAddress || null}, ${action}, ${target}, ${note || null}, ${txHash || null})`;
}

export function forbiddenMutation() {
  return NextResponse.json({ error: "Action is not available for this record." }, { status: 409 });
}

export function mapMarket(value: unknown) {
  return String(value || "Escrow").replace(/_/g, " ");
}
