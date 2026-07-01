import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/api";
import { readListingCount, readPaused } from "@/lib/contract";

export async function GET() {
  const checks: Record<string, string> = {};

  const db = getDatabase();
  if (!db) {
    checks.database = "unconfigured";
  } else {
    try {
      await db`SELECT 1`;
      checks.database = "healthy";
    } catch (err) {
      checks.database = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const escrowAddr = process.env.NEXT_PUBLIC_ESCROW_CONTRACT;
  checks.escrow_contract = escrowAddr ? "configured" : "missing";
  checks.alchemy = process.env.ALCHEMY_KEY ? "configured" : "missing";
  checks.encryption = process.env.MESSAGE_ENCRYPTION_KEY ? "configured" : "missing";

  try {
    const count = await readListingCount();
    const paused = await readPaused();
    checks.chain_rpc = "healthy";
    checks.contract_listings = count.toString();
    checks.contract_paused = paused ? "true" : "false";
  } catch (err) {
    checks.chain_rpc = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  const allHealthy =
    checks.database === "healthy" &&
    checks.escrow_contract === "configured" &&
    checks.alchemy === "configured" &&
    checks.encryption === "configured" &&
    checks.chain_rpc === "healthy";

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 },
  );
}
