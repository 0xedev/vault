import { decodeEventLog, parseAbi } from "viem";
import { base } from "viem/chains";
import { getDatabase, databaseRequired } from "@/lib/api";
import { getEscrowAddress, getPublicClient } from "@/lib/contract";

const SYNC_EVENT_ABI = parseAbi([
  "event Listed(uint256 indexed listingId, address borrower, address nftContract, uint256 tokenId, uint256 amount, uint256 apr, uint256 term)",
  "event OfferSubmitted(uint256 indexed listingId, address lender, uint256 amount, uint256 apr, uint256 term)",
  "event OfferAccepted(uint256 indexed listingId, address lender, uint256 amount)",
  "event Repaid(uint256 indexed listingId, uint256 amount)",
  "event Disputed(uint256 indexed listingId)",
  "event Resolved(uint256 indexed listingId, uint8 outcome, bool nftToLender)",
  "event DealListed(uint256 indexed dealId, address seller, uint256 price, bytes32 metadataHash)",
  "event DealFunded(uint256 indexed dealId, address buyer, uint256 amount)",
  "event DealDelivered(uint256 indexed dealId)",
  "event DealConfirmed(uint256 indexed dealId, uint256 sellerAmount)",
  "event DealDisputed(uint256 indexed dealId)",
  "event DealResolved(uint256 indexed dealId, uint256 buyerAmount, uint256 sellerAmount)",
  "event DealRefunded(uint256 indexed dealId)",
  "event MiniAppListed(uint256 indexed listingId, address seller, uint256 price, bytes32 metadataHash)",
  "event MiniAppSold(uint256 indexed listingId, address buyer, uint256 amount)",
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
  const contractAddress = getEscrowAddress();
  const cursorId = `${chainId}:${contractAddress.toLowerCase()}`;
  const cursorRows = await db`SELECT last_synced_block FROM sync_cursors WHERE id = ${cursorId} LIMIT 1` as Record<string, unknown>[];
  const lastSynced = BigInt(String(cursorRows[0]?.last_synced_block || "0"));
  const client = getPublicClient();
  const latest = await client.getBlockNumber();
  const zero = BigInt(0);
  const one = BigInt(1);
  const lookback = BigInt(5000);
  const fromBlock = lastSynced > zero ? lastSynced + one : latest > lookback ? latest - lookback : zero;

  const logs = await client.getLogs({ address: contractAddress, fromBlock, toBlock: latest });

  for (const log of logs) {
    const txHash = log.transactionHash;
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

    if (decoded.eventName === "Listed") {
      const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
      if (listingId) {
        await db`UPDATE listings SET contract_listing_id = ${listingId}, tx_status = 'confirmed', updated_at = NOW() WHERE tx_hash = ${txHash}`;
      }
    }

    if (decoded.eventName === "OfferSubmitted") {
      await db`UPDATE offers SET tx_status = 'confirmed' WHERE tx_hash = ${txHash}`;
    }

    if (decoded.eventName === "OfferAccepted") {
      const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
      if (listingId) {
        await db`UPDATE listings SET status = 'funded', updated_at = NOW() WHERE contract_listing_id = ${listingId}`;
      }
      await db`UPDATE offers SET status = 'accepted', tx_status = 'confirmed' WHERE tx_hash = ${txHash}`;
    }

    if (decoded.eventName === "Repaid") {
      const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
      if (listingId) {
        await db`UPDATE listings SET status = 'completed', collateral_data = jsonb_set(collateral_data::jsonb, '{status}', '"repaid"'::jsonb, true), updated_at = NOW() WHERE contract_listing_id = ${listingId}`;
      }
    }

    if (decoded.eventName === "Disputed") {
      const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
      if (listingId) {
        await db`UPDATE listings SET status = 'disputed', collateral_data = jsonb_set(collateral_data::jsonb, '{status}', '"disputed"'::jsonb, true), updated_at = NOW() WHERE contract_listing_id = ${listingId}`;
      }
    }

    if (decoded.eventName === "Resolved") {
      const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
      if (listingId) {
        await db`UPDATE listings SET status = 'completed', updated_at = NOW() WHERE contract_listing_id = ${listingId}`;
      }
    }

    if (decoded.eventName === "DealListed") {
      const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
      if (dealId) {
        await db`UPDATE listings SET contract_listing_id = COALESCE(contract_listing_id, ${dealId}), tx_status = 'confirmed', updated_at = NOW() WHERE tx_hash = ${txHash}`;
      }
    }

    if (decoded.eventName === "MiniAppListed") {
      const listingId = bigNumberishToString(eventArg(decoded.args, "listingId"));
      if (listingId) {
        await db`UPDATE listings SET contract_listing_id = COALESCE(contract_listing_id, ${listingId}), tx_status = 'confirmed', updated_at = NOW() WHERE tx_hash = ${txHash}`;
      }
    }

    if (decoded.eventName === "DealFunded") {
      const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
      if (dealId) {
        await db`UPDATE escrows SET contract_listing_id = COALESCE(contract_listing_id, ${dealId}), stage = 'funds_locked', tx_status = 'confirmed', updated_at = NOW() WHERE tx_hash = ${txHash}`;
      }
    }

    if (decoded.eventName === "DealDelivered") {
      const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
      if (dealId) {
        await db`UPDATE escrows SET stage = 'asset_transferred', tx_status = 'confirmed', updated_at = NOW() WHERE contract_listing_id = ${dealId} OR tx_hash = ${txHash}`;
      }
    }

    if (decoded.eventName === "DealConfirmed") {
      const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
      if (dealId) {
        await db`UPDATE escrows SET stage = 'released', tx_status = 'confirmed', updated_at = NOW() WHERE contract_listing_id = ${dealId} OR tx_hash = ${txHash}`;
      }
    }

    if (decoded.eventName === "DealDisputed") {
      const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
      if (dealId) {
        await db`UPDATE escrows SET stage = 'disputed', tx_status = 'confirmed', updated_at = NOW() WHERE contract_listing_id = ${dealId} OR tx_hash = ${txHash}`;
      }
    }

    if (decoded.eventName === "DealResolved") {
      const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
      const buyerAmount = eventArg(decoded.args, "buyerAmount");
      const sellerAmount = eventArg(decoded.args, "sellerAmount");
      if (dealId) {
        // If seller gets 0 and buyer gets full balance back, it's effectively a refund
        const stage = (Number(sellerAmount || 0) === 0) ? "refunded" : "released";
        await db`UPDATE escrows SET stage = ${stage}, tx_status = 'confirmed', updated_at = NOW() WHERE contract_listing_id = ${dealId} OR tx_hash = ${txHash}`;
      }
    }

    if (decoded.eventName === "DealRefunded") {
      const dealId = bigNumberishToString(eventArg(decoded.args, "dealId"));
      if (dealId) {
        await db`UPDATE escrows SET stage = 'refunded', tx_status = 'confirmed', updated_at = NOW() WHERE contract_listing_id = ${dealId} OR tx_hash = ${txHash}`;
      }
    }
  }

  await db`INSERT INTO sync_cursors (id, chain_id, contract_address, last_synced_block, updated_at)
    VALUES (${cursorId}, ${chainId}, ${contractAddress}, ${latest.toString()}, NOW())
    ON CONFLICT (id) DO UPDATE SET last_synced_block = ${latest.toString()}, updated_at = NOW()`;

  return { data: { fromBlock: fromBlock.toString(), toBlock: latest.toString(), events: logs.length } };
}
