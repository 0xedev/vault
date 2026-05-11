import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log("Seeding database...");

  // Users
  const users = [
    { address: "0x9a4fb5c12e9012d3f4567890abcdef1234567", trades: 4128, reputation: 4.8 },
    { address: "0xfa120011abcd9012e3f4ab5678901234cd5678", trades: 18, reputation: 3.2 },
    { address: "0x52c1ab09def90123ab456c7890123d4ef5678901", trades: 64, reputation: 4.1 },
    { address: "0x33ee8810cafebabe1234567890abcdef12345678", trades: 6, reputation: 1.5 },
  ];

  for (const u of users) {
    await sql`INSERT INTO users (address, trades, reputation) VALUES (${u.address}, ${u.trades}, ${u.reputation}) ON CONFLICT (address) DO NOTHING`;
  }

  // Listings (NFT Loans)
  const listings = [
    { id: "L-2841", seller: users[0].address, marketplace: "nft_loan", title: "Meridian Genesis #1147", price: 8.4, collateral_data: JSON.stringify({ coll: 0, token: "#1147", apr: 14.2, term: 30, ltv: 56, value: 15.0, status: "open" }), status: "active" },
    { id: "L-2840", seller: users[1].address, marketplace: "nft_loan", title: "Aperture #0289", price: 22.0, collateral_data: JSON.stringify({ coll: 1, token: "#0289", apr: 9.8, term: 60, ltv: 48, value: 45.8, status: "funded" }), status: "funded" },
    { id: "L-2839", seller: users[2].address, marketplace: "nft_loan", title: "Hollow Forms #3301", price: 3.2, collateral_data: JSON.stringify({ coll: 2, token: "#3301", apr: 18.5, term: 14, ltv: 64, value: 5.0, status: "warn" }), status: "active" },
    { id: "L-2838", seller: users[3].address, marketplace: "nft_loan", title: "Cipher Drones #0042", price: 12.5, collateral_data: JSON.stringify({ coll: 3, token: "#0042", apr: 11.0, term: 45, ltv: 51, value: 24.5, status: "open" }), status: "active" },
  ];

  for (const l of listings) {
    await sql`INSERT INTO listings (id, seller_address, marketplace, title, price, collateral_data, status) VALUES (${l.id}, ${l.seller}, ${l.marketplace}, ${l.title}, ${l.price}, ${l.collateral_data}, ${l.status}) ON CONFLICT (id) DO NOTHING`;
  }

  // Escrows
  const escrows = [
    { id: "E-9931", listing_id: "L-2840", buyer: users[1].address, seller: users[0].address, amount: 22.0, stage: "funds_locked" },
    { id: "E-9928", listing_id: "L-2839", buyer: users[2].address, seller: users[3].address, amount: 3.2, stage: "awaiting_confirmation" },
  ];

  for (const e of escrows) {
    await sql`INSERT INTO escrows (id, listing_id, buyer_address, seller_address, amount, stage) VALUES (${e.id}, ${e.listing_id}, ${e.buyer}, ${e.seller}, ${e.amount}, ${e.stage}) ON CONFLICT (id) DO NOTHING`;
  }

  console.log("Seed complete.");
}

seed().catch(console.error);
