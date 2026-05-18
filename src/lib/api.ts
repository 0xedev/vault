import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export type DbClient = ReturnType<typeof neon>;

export function getDatabase(): DbClient | null {
  const url = process.env.DATABASE_URL;
  return url ? neon(url) : null;
}

export function databaseRequired() {
  return NextResponse.json(
    {
      error: "Live database is not configured.",
      code: "DATABASE_URL_REQUIRED",
      detail: "Set DATABASE_URL and run the Drizzle migration before using this endpoint.",
    },
    { status: 503 },
  );
}

export function badRequest(error: string, details?: unknown) {
  return NextResponse.json({ error, details }, { status: 400 });
}

export function jsonRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function jsonArray(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function shortAddress(address: unknown): string {
  const value = String(address || "");
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function relativeDeadline(value: unknown): string {
  if (!value) return "No deadline";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "No deadline";
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return "Overdue";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `in ${days}d${hours ? ` ${hours}h` : ""}`;
  return `in ${Math.max(1, hours)}h`;
}

export function stageLabel(stage: unknown): string {
  const value = String(stage || "awaiting_deposit");
  const labels: Record<string, string> = {
    awaiting_deposit: "Awaiting deposit",
    funds_locked: "Funds locked",
    asset_transferred: "Transfer",
    awaiting_confirmation: "Awaiting confirmation",
    released: "Released",
    disputed: "Disputed",
    refunded: "Refunded",
  };
  return labels[value] || value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
