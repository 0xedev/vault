import { base } from "viem/chains";
import { getDatabase, databaseRequired } from "@/lib/api";
import { getEscrowAddress, getPublicClient } from "@/lib/contract";

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
  }

  await db`INSERT INTO sync_cursors (id, chain_id, contract_address, last_synced_block, updated_at)
    VALUES (${cursorId}, ${chainId}, ${contractAddress}, ${latest.toString()}, NOW())
    ON CONFLICT (id) DO UPDATE SET last_synced_block = ${latest.toString()}, updated_at = NOW()`;

  return { data: { fromBlock: fromBlock.toString(), toBlock: latest.toString(), events: logs.length } };
}
