import { decodeEventLog, parseAbi } from "viem";
import { base } from "viem/chains";
import { getDatabase, databaseRequired } from "@/lib/api";
import { getEscrowAddress, getNftAddress, getDealsAddress, getPublicClient } from "@/lib/contract";
import { logger } from "@/lib/logger";

const SYNC_EVENT_ABI = parseAbi([
  "event Listed(uint256 indexed listingId, address borrower, address nftContract, uint256 tokenId, uint256 amount, uint256 apr, uint256 term)",
  "event Cancelled(uint256 indexed listingId)",
  "event OfferSubmitted(uint256 indexed listingId, address lender, uint256 amount, uint256 apr, uint256 term)",
  "event OfferWithdrawn(uint256 indexed listingId, address lender, uint256 amount)",
  "event OfferAccepted(uint256 indexed listingId, address lender, uint256 amount)",
  "event Repaid(uint256 indexed listingId, uint256 amount)",
  "event DefaultClaimed(uint256 indexed listingId, address lender, address nftContract, uint256 tokenId)",
  "event Disputed(uint256 indexed listingId)",
  "event Resolved(uint256 indexed listingId, uint8 outcome, bool nftToLender)",
  "event ListingUpdated(uint256 indexed listingId, uint256 amount, uint256 apr, uint256 term)",
  "event DealListed(uint256 indexed dealId, address seller, uint256 price, bytes32 metadataHash)",
  "event DealFunded(uint256 indexed dealId, address buyer, uint256 amount)",
  "event DealDelivered(uint256 indexed dealId)",
  "event DealConfirmed(uint256 indexed dealId, uint256 sellerAmount)",
  "event DealDisputed(uint256 indexed dealId)",
  "event DealResolved(uint256 indexed dealId, uint256 buyerAmount, uint256 sellerAmount)",
  "event DealRefunded(uint256 indexed dealId)",
  "event DealCancelled(uint256 indexed dealId)",
  "event DealDeadlineExtended(uint256 indexed dealId, uint256 newDeadline)",
  "event DealOfferSubmitted(uint256 indexed dealId, address buyer, uint256 amount)",
  "event DealOfferWithdrawn(uint256 indexed dealId, address buyer, uint256 amount)",
  "event DealOfferAccepted(uint256 indexed dealId, address buyer, uint256 amount)",
  "event MiniAppListed(uint256 indexed listingId, address seller, uint256 price, bytes32 metadataHash)",
  "event MiniAppSold(uint256 indexed listingId, address buyer, uint256 amount)",
  "event MiniAppCancelled(uint256 indexed listingId)",
]);

function eventArg(args: unknown, key: string) {
  if (!args || typeof args !== "object") return undefined;
  return (args as Record<string, unknown>)[key];
}

function bigNumberishToString(value: unknown) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

export async function syncEscrowEvents() {
  const db = getDatabase();
  if (!db) return { response: databaseRequired() };

  const chainId = base.id;
  const escrowAddr = getEscrowAddress();
  const nftAddr = await getNftAddress();
  const dealsAddr = await getDealsAddress();
  const client = getPublicClient();
  const latest = await client.getBlockNumber();
  const zero = BigInt(0);
  const one = BigInt(1);
  const lookback = BigInt(5000);

  let syncedCount = 0;
  let errorCount = 0;
  let totalEvents = 0;

  for (const contractAddress of [nftAddr, dealsAddr]) {
    const contractAddressLower = contractAddress.toLowerCase();
    const dbContractAddress = contractAddressLower === dealsAddr.toLowerCase() ? escrowAddr : contractAddress;
    const cursorId = `${chainId}:${contractAddress.toLowerCase()}`;
    const cursorRows = await db`SELECT last_synced_block FROM sync_cursors WHERE id = ${cursorId} LIMIT 1` as Record<string, unknown>[];
    const lastSynced = BigInt(String(cursorRows[0]?.last_synced_block || "0"));
    const fromBlock = lastSynced > zero ? lastSynced + one : latest > lookback ? latest - lookback : zero;

    const logs = await client.getLogs({ address: contractAddress, fromBlock, toBlock: latest });
    totalEvents += logs.length;

    for (const log of logs) {
      const txHash = log.transactionHash;
      try {
        await db`UPDATE transactions SET status = 'confirmed' WHERE tx_hash = ${txHash}`;
        await db`UPDATE listings SET tx_status = 'confirmed', updated_at = NOW() WHERE tx_hash = ${txHash}`;
        await db`UPDATE offers SET tx_status = 'confirmed' WHERE tx_hash = ${txHash}`;
        await db`UPDATE escrows SET tx_status = 'confirmed', updated_at = NOW() WHERE tx_hash = ${txHash}`;

        const decoded = (() => {
          try {
            return decodeEventLog({ abi: SYNC_EVENT_ABI, data: log.data, topics: log.topics });
          } catch {
            return null;
          }
        })();
        if (!decoded) continue;

        let handled = false;

        if (decoded.eventName === "Listed") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          if (listingId) {
            await db`UPDATE listings SET contract_listing_id = ${listingId}, contract_address = ${dbContractAddress}, tx_status = 'confirmed', updated_at = NOW() WHERE tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "OfferSubmitted") {
          await db`UPDATE offers SET tx_status = 'confirmed' WHERE tx_hash = ${txHash}`;
          handled = true;
        }

        if (decoded.eventName === "OfferAccepted") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          if (listingId) {
            await db`UPDATE listings SET status = 'funded', collateral_data = jsonb_set(COALESCE(collateral_data::jsonb, '{}'::jsonb), '{status}', '"funded"'::jsonb, true), updated_at = NOW() WHERE contract_listing_id = ${listingId} AND lower(contract_address) = ${contractAddressLower}`;
          }
          await db`UPDATE offers SET status = 'accepted', tx_status = 'confirmed' WHERE tx_hash = ${txHash}`;
          handled = true;
        }

        if (decoded.eventName === "Repaid") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          if (listingId) {
            await db`UPDATE listings SET status = 'completed', collateral_data = jsonb_set(COALESCE(collateral_data::jsonb, '{}'::jsonb), '{status}', '"repaid"'::jsonb, true), updated_at = NOW() WHERE contract_listing_id = ${listingId} AND lower(contract_address) = ${contractAddressLower}`;
          }
          handled = true;
        }

        if (decoded.eventName === "Disputed") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          if (listingId) {
            await db`UPDATE listings SET status = 'disputed', collateral_data = jsonb_set(COALESCE(collateral_data::jsonb, '{}'::jsonb), '{status}', '"disputed"'::jsonb, true), updated_at = NOW() WHERE contract_listing_id = ${listingId} AND lower(contract_address) = ${contractAddressLower}`;
          }
          handled = true;
        }

        if (decoded.eventName === "Resolved") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          if (listingId) {
            await db`UPDATE listings SET status = 'completed', updated_at = NOW() WHERE contract_listing_id = ${listingId} AND lower(contract_address) = ${contractAddressLower}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealListed") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          if (dealId) {
            await db`UPDATE listings SET contract_listing_id = COALESCE(contract_listing_id, ${dealId}), contract_address = ${dbContractAddress}, tx_status = 'confirmed', updated_at = NOW() WHERE tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "MiniAppListed") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          if (listingId) {
            await db`UPDATE listings SET contract_listing_id = COALESCE(contract_listing_id, ${listingId}), contract_address = ${dbContractAddress}, tx_status = 'confirmed', updated_at = NOW() WHERE tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealFunded") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          if (dealId) {
            await db`UPDATE escrows SET contract_listing_id = COALESCE(contract_listing_id, ${dealId}), contract_address = ${dbContractAddress}, stage = 'funds_locked', tx_status = 'confirmed', updated_at = NOW() WHERE tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealDelivered") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          if (dealId) {
            await db`UPDATE escrows SET stage = 'asset_transferred', tx_status = 'confirmed', updated_at = NOW() WHERE (contract_listing_id = ${dealId} AND lower(contract_address) = ${String(dbContractAddress).toLowerCase()}) OR tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealConfirmed") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          if (dealId) {
            await db`UPDATE escrows SET stage = 'released', tx_status = 'confirmed', updated_at = NOW() WHERE (contract_listing_id = ${dealId} AND lower(contract_address) = ${String(dbContractAddress).toLowerCase()}) OR tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealDisputed") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          if (dealId) {
            await db`UPDATE escrows SET stage = 'disputed', tx_status = 'confirmed', updated_at = NOW() WHERE (contract_listing_id = ${dealId} AND lower(contract_address) = ${String(dbContractAddress).toLowerCase()}) OR tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealResolved") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          const sellerAmount = eventArg(decoded.args, "sellerAmount");
          if (dealId) {
            const stage = (Number(sellerAmount || 0) === 0) ? "refunded" : "released";
            await db`UPDATE escrows SET stage = ${stage}, tx_status = 'confirmed', updated_at = NOW() WHERE (contract_listing_id = ${dealId} AND lower(contract_address) = ${String(dbContractAddress).toLowerCase()}) OR tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealRefunded") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          if (dealId) {
            await db`UPDATE escrows SET stage = 'refunded', tx_status = 'confirmed', updated_at = NOW() WHERE (contract_listing_id = ${dealId} AND lower(contract_address) = ${String(dbContractAddress).toLowerCase()}) OR tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "Cancelled") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          if (listingId) {
            await db`UPDATE listings SET status = 'cancelled', tx_status = 'confirmed', updated_at = NOW() WHERE contract_listing_id = ${listingId} AND lower(contract_address) = ${contractAddressLower}`;
          }
          handled = true;
        }

        if (decoded.eventName === "OfferWithdrawn") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          const lender = eventArg(decoded.args, "lender");
          if (listingId && lender) {
            await db`UPDATE offers SET status = 'withdrawn', tx_status = 'confirmed' WHERE listing_id = (SELECT id FROM listings WHERE contract_listing_id = ${listingId} AND lower(contract_address) = ${contractAddressLower} LIMIT 1) AND offerer_address = ${String(lender).toLowerCase()}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DefaultClaimed") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          if (listingId) {
            await db`UPDATE listings SET status = 'funded', collateral_data = jsonb_set(COALESCE(collateral_data::jsonb, '{}'::jsonb), '{status}', '"default"'::jsonb, true), updated_at = NOW() WHERE contract_listing_id = ${listingId} AND lower(contract_address) = ${contractAddressLower}`;
          }
          handled = true;
        }

        if (decoded.eventName === "ListingUpdated") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          if (listingId) {
            await db`UPDATE listings SET tx_status = 'confirmed', updated_at = NOW() WHERE contract_listing_id = ${listingId} AND lower(contract_address) = ${contractAddressLower}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealCancelled") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          if (dealId) {
            await db`UPDATE escrows SET stage = 'cancelled', tx_status = 'confirmed', updated_at = NOW() WHERE (contract_listing_id = ${dealId} AND lower(contract_address) = ${String(dbContractAddress).toLowerCase()}) OR tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealDeadlineExtended") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          if (dealId) {
            await db`UPDATE escrows SET tx_status = 'confirmed', updated_at = NOW() WHERE (contract_listing_id = ${dealId} AND lower(contract_address) = ${String(dbContractAddress).toLowerCase()}) OR tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealOfferSubmitted") {
          await db`UPDATE offers SET tx_status = 'confirmed' WHERE tx_hash = ${txHash}`;
          handled = true;
        }

        if (decoded.eventName === "DealOfferWithdrawn") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          const buyer = eventArg(decoded.args, "buyer");
          if (dealId && buyer) {
            await db`UPDATE offers SET status = 'withdrawn', tx_status = 'confirmed' WHERE tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "DealOfferAccepted") {
          const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
          if (dealId) {
            await db`UPDATE escrows SET stage = 'funds_locked', tx_status = 'confirmed', updated_at = NOW() WHERE (contract_listing_id = ${dealId} AND lower(contract_address) = ${String(dbContractAddress).toLowerCase()}) OR tx_hash = ${txHash}`;
          }
          handled = true;
        }

        if (decoded.eventName === "MiniAppCancelled") {
          const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
          if (listingId) {
            await db`UPDATE listings SET status = 'cancelled', tx_status = 'confirmed', updated_at = NOW() WHERE contract_listing_id = ${listingId} AND lower(contract_address) = ${String(dbContractAddress).toLowerCase()}`;
          }
          handled = true;
        }

        if (handled) syncedCount++;
      } catch (err) {
        errorCount++;
        logger.error("sync_event_failed", {
          tx_hash: txHash,
          block_number: log.blockNumber?.toString(),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await db`INSERT INTO sync_cursors (id, chain_id, contract_address, last_synced_block, updated_at)
      VALUES (${cursorId}, ${chainId}, ${contractAddress}, ${latest.toString()}, NOW())
      ON CONFLICT (id) DO UPDATE SET last_synced_block = ${latest.toString()}, updated_at = NOW()`;
  }

  logger.info("sync_completed", {
    to_block: latest.toString(),
    total_events: totalEvents,
    synced: syncedCount,
    errors: errorCount,
  });

  return { data: { toBlock: latest.toString(), events: totalEvents, synced: syncedCount, errors: errorCount } };
}
