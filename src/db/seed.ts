import { neon } from "@neondatabase/serverless";
import "dotenv/config";

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const sql = neon(process.env.DATABASE_URL);
  await sql`SELECT 1`;
  console.log("Database connection verified. No seed data was inserted.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
