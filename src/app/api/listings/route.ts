import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, getDatabase, jsonRecord } from "@/lib/api";
import { mapLoanListing } from "@/lib/marketplace";
import { actorAddressForRequest, requireUser } from "@/lib/auth";
import { getNftAddress, readAllListings, readListing, mapListingStage } from "@/lib/contract";
import { activeListingContractAddress } from "@/lib/listing-contracts";
import { fetchIndexedNftListings, mergeIndexedListingRows, nftListingRowFromSubgraph } from "@/lib/subgraph";
import type { Loan } from "@/lib/data";

const walletAddressSchema = z.string().startsWith("0x").length(42);

async function filterContractLiveLoanRows(rows: Record<string, unknown>[]) {
  const checked = await Promise.allSettled(rows.map(async (row) => {
    const contractListingId = String(row.contract_listing_id || "");
    if (!contractListingId) return null;
    const listing = await readListing(BigInt(contractListingId));
    return mapListingStage(listing.stage) === "listed" ? row : null;
  }));
  return checked.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
}

const listingSchema = z.object({
  id: z.string().min(1).optional(),
  seller: z.string().startsWith("0x").min(10).optional(),
  amount: z.number().positive(),
  apr: z.number().min(0).max(100),
  term: z.number().int().positive().max(365),
  collection: z.string().min(1),
  tokenId: z.string().min(1),
  ltv: z.number().min(0).max(100),
  value: z.number().nonnegative().optional(),
  imageUrl: z.string().optional(),
  chainId: z.number().int().positive().optional(),
  contractAddress: z.string().startsWith("0x").optional(),
  contractListingId: z.string().optional(),
  txHash: z.string().startsWith("0x").optional(),
});

export async function GET(req: NextRequest) {
  const db = getDatabase();

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "all";
  const sort = url.searchParams.get("sort") || "apr";
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const chain = url.searchParams.get("chain") === "true";
  const includeOffchain = url.searchParams.get("includeOffchain") === "true";
  const sellerAddressParam = url.searchParams.get("sellerAddress") || url.searchParams.get("borrower");
  const parsedSellerAddress = sellerAddressParam ? walletAddressSchema.safeParse(sellerAddressParam) : null;

  // On-chain mode — read from contract, reconcile to DB
  if (chain) {
    try {
      const vaultNftAddress = await getNftAddress();
      const activeContract = vaultNftAddress.toLowerCase();
      const onChain = await readAllListings();
      const onChainIds = onChain.map(({ id }) => id.toString());
      const dbEnrich: Record<string, Record<string, unknown>> = {};
      if (db && onChainIds.length > 0) {
        const matchRows = await db`
          SELECT * FROM listings
          WHERE contract_listing_id = ANY(${onChainIds})
            AND marketplace = 'nft_loan'
            AND lower(contract_address) = ${activeContract}
        ` as Record<string, unknown>[];
        for (const r of matchRows) {
          dbEnrich[String(r.contract_listing_id)] = r;
        }
      }

      // Reconcile: create DB records for on-chain listings that have none
      if (db) {
        for (const { id, data } of onChain) {
          const contractListingId = id.toString();
          if (dbEnrich[contractListingId]) continue;

          const dbId = `C-${id}`;
          const title = `${data.nftContract.slice(0, 10)}... #${data.nftTokenId}`;
          const collateralData = JSON.stringify({
            token: data.nftTokenId.toString(),
            apr: Number(data.apr) / 100,
            term: Number(data.term),
            ltv: 0,
            status: "open",
            value: 0,
            imageUrl: "",
            nftContract: data.nftContract,
          });

          await db`INSERT INTO users (address) VALUES (${data.borrower}) ON CONFLICT (address) DO NOTHING`;
          const inserted = await db`
            INSERT INTO listings (id, seller_address, marketplace, title, price, collateral_data, status, moderation_status, chain_id, contract_address, contract_listing_id, tx_hash, tx_status)
            VALUES (${dbId}, ${data.borrower}, 'nft_loan', ${title}, ${Number(data.principal) / 1e6}, ${collateralData}, 'active', 'approved', 8453, ${vaultNftAddress}, ${contractListingId}, NULL, 'offchain')
            RETURNING *
          ` as Record<string, unknown>[];
          if (inserted.length > 0) dbEnrich[contractListingId] = inserted[0];
        }
      }

      const data = onChain.map(({ id, data }) => {
        const contractListingId = id.toString();
        const dbRow = dbEnrich[contractListingId];
        const dbCollateral = dbRow ? jsonRecord(dbRow.collateral_data) : null;

        const onChainStatus = mapListingStage(data.stage);
        const mappedStatus: Loan["status"] =
          onChainStatus === "listed" ? "open" :
          onChainStatus === "funded" ? "funded" :
          onChainStatus === "active" ? "funded" :
          onChainStatus === "repaid" ? "repaid" :
          onChainStatus === "defaulted" ? "default" :
          onChainStatus === "cancelled" ? "cancelled" as Loan["status"] :
          onChainStatus === "disputed" ? "disputed" : "open";

        return {
          id: dbRow ? String(dbRow.id) : `C-${id}`,
          coll: dbCollateral?.coll ? Number(dbCollateral.coll) : 0,
          token: String(dbCollateral?.token || data.nftTokenId.toString()),
          amt: Number(data.principal) / 1e6,
          apr: Number(data.apr) / 100,
          term: Number(data.term),
          ltv: dbCollateral?.ltv ? Number(dbCollateral.ltv) : 0,
          status: mappedStatus,
          bid: dbCollateral?.bid ? Number(dbCollateral.bid) : 0,
          value: dbCollateral?.value ? Number(dbCollateral.value) : 0,
          borrower: data.borrower,
          collection: dbRow ? String(dbRow.title || "").split(" #")[0] || data.nftContract.slice(0, 10) + "..." : data.nftContract.slice(0, 10) + "...",
          imageUrl: String(dbCollateral?.imageUrl || ""),
          sellerAddress: dbRow ? String(dbRow.seller_address) : data.borrower,
          chainId: 8453,
          contractAddress: vaultNftAddress,
          nftContract: data.nftContract,
          contractListingId,
          onChain: true,
        };
      });

      return NextResponse.json({ data, total: data.length });
    } catch (err) {
      return NextResponse.json({
        error: "Failed to read from chain",
        detail: err instanceof Error ? err.message : String(err),
      }, { status: 502 });
    }
  }

  // Default: DB listings only (fast path)
  const activeContract = await activeListingContractAddress("nft_loan");

  let rows: Record<string, unknown>[];
  if (!db) {
    rows = [];
  } else if (parsedSellerAddress?.success) {
    const sellerAddress = parsedSellerAddress.data.toLowerCase();
    if (includeOffchain) {
      rows = (status === "all"
        ? await db`SELECT *, COUNT(*) OVER() AS total_count FROM listings WHERE marketplace = 'nft_loan' AND status <> 'cancelled' AND lower(seller_address) = ${sellerAddress} AND (contract_address IS NULL OR lower(contract_address) = ${activeContract}) ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
        : await db`SELECT *, COUNT(*) OVER() AS total_count FROM listings WHERE marketplace = 'nft_loan' AND status <> 'cancelled' AND collateral_data->>'status' = ${status} AND lower(seller_address) = ${sellerAddress} AND (contract_address IS NULL OR lower(contract_address) = ${activeContract}) ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      ) as Record<string, unknown>[];
    } else {
      rows = (status === "all"
        ? await db`SELECT *, COUNT(*) OVER() AS total_count FROM listings WHERE marketplace = 'nft_loan' AND status <> 'cancelled' AND lower(seller_address) = ${sellerAddress} AND lower(contract_address) = ${activeContract} AND contract_listing_id IS NOT NULL ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
        : await db`SELECT *, COUNT(*) OVER() AS total_count FROM listings WHERE marketplace = 'nft_loan' AND status <> 'cancelled' AND collateral_data->>'status' = ${status} AND lower(seller_address) = ${sellerAddress} AND lower(contract_address) = ${activeContract} AND contract_listing_id IS NOT NULL ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      ) as Record<string, unknown>[];
    }
  } else {
    rows = (status === "all"
      ? await db`SELECT *, COUNT(*) OVER() AS total_count FROM listings WHERE marketplace = 'nft_loan' AND status <> 'cancelled' AND lower(contract_address) = ${activeContract} AND contract_listing_id IS NOT NULL ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      : await db`SELECT *, COUNT(*) OVER() AS total_count FROM listings WHERE marketplace = 'nft_loan' AND status <> 'cancelled' AND collateral_data->>'status' = ${status} AND lower(contract_address) = ${activeContract} AND contract_listing_id IS NOT NULL ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    ) as Record<string, unknown>[];
  }

  try {
    const indexed = await fetchIndexedNftListings({
      sellerAddress: parsedSellerAddress?.success ? parsedSellerAddress.data : undefined,
      limit: Math.max(limit + offset, 100),
    });
    const indexedRows = indexed
      .filter((listing) => listing.contract.toLowerCase() === activeContract)
      .map((listing) => {
        const existing = rows.find((row) =>
          String(row.contract_listing_id || "") === listing.listingId &&
          String(row.contract_address || "").toLowerCase() === listing.contract.toLowerCase()
        );
        return nftListingRowFromSubgraph(listing, existing);
      })
      .filter((row) => {
        const rowStatus = String(row.status || "");
        if (rowStatus === "cancelled") return false;
        if (status === "all") return true;
        return jsonRecord(row.collateral_data).status === status || rowStatus === status;
      });
    rows = mergeIndexedListingRows(rows, indexedRows);
  } catch {
    if (!includeOffchain) rows = await filterContractLiveLoanRows(rows);
  }

  const total = rows.length;

  const data = rows.map(mapLoanListing);

  if (sort === "apr") data.sort((a, b) => b.apr - a.apr);
  if (sort === "amt") data.sort((a, b) => b.amt - a.amt);
  if (sort === "ltv") data.sort((a, b) => a.ltv - b.ltv);

  return NextResponse.json({ data, total, offset, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid listing", parsed.error.flatten());

  const db = auth.db;

  const data = parsed.data;
  const sellerAddress = actorAddressForRequest(auth.user, data.seller);
  const activeContract = await activeListingContractAddress("nft_loan");
  if (!data.contractAddress || data.contractAddress.toLowerCase() !== activeContract) {
    return badRequest("Listing must be created against the active VaultNFT contract.");
  }
  const id = data.id || `L-${Date.now()}`;
  const collateralData = JSON.stringify({
    collection: data.collection,
    token: data.tokenId,
    apr: data.apr,
    term: data.term,
    ltv: data.ltv,
    status: "open",
    value: data.value || 0,
    imageUrl: data.imageUrl || "",
  });

  await db`INSERT INTO users (address) VALUES (${sellerAddress}) ON CONFLICT (address) DO NOTHING`;
  await db`INSERT INTO listings (id, seller_address, marketplace, title, price, collateral_data, status, moderation_status, chain_id, contract_address, contract_listing_id, tx_hash, tx_status)
    VALUES (${id}, ${sellerAddress}, 'nft_loan', ${`${data.collection} ${data.tokenId}`}, ${data.amount}, ${collateralData}, 'active', 'approved', ${data.chainId || null}, ${data.contractAddress || null}, ${data.contractListingId || null}, ${data.txHash || null}, ${data.txHash ? "pending" : "offchain"})`;

  return NextResponse.json({ data: { id, ...data, status: "open" } }, { status: 201 });
}
