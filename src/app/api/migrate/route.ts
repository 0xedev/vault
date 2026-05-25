import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });

  const sql = neon(url);
  const fileSql = readFileSync(path.join(process.cwd(), "drizzle", "0002_early_glorian.sql"), "utf8");
  // Drizzle uses --> statement-breakpoint as separator
  const statements = fileSql.split(/--> statement-breakpoint/).map(s => s.trim()).filter(s => s);
  const results: string[] = [];
  let ok = 0, skip = 0, err = 0;

  for (const stmt of statements) {
    try {
      await sql.query(stmt);
      ok++;
    } catch (e: unknown) {
      const msg = e?.message || String(e);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        skip++;
      } else {
        results.push("ERR: " + msg.slice(0, 120));
        err++;
      }
    }
  }

  return NextResponse.json({ ok, skip, err, details: results });
}
