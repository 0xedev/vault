import { createPublicClient, createWalletClient, custom, decodeEventLog, http, keccak256, parseAbi, toHex, type Address, type Hash } from "viem";
import { base } from "viem/chains";

const ESCROW_EVENT_ABI = parseAbi([
  "event Listed(uint256 indexed listingId, address borrower, address nftContract, uint256 tokenId, uint256 amount, uint256 apr, uint256 term)",
  "event DealListed(uint256 indexed dealId, address seller, uint256 price, bytes32 metadataHash)",
]);

export function getEscrowAddress(): Address {
  const addr = process.env.NEXT_PUBLIC_ESCROW_CONTRACT;
  if (!addr) throw new Error("NEXT_PUBLIC_ESCROW_CONTRACT not set");
  return addr as Address;
}

export function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(),
  });
}

export function getWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet available");
  }
  return createWalletClient({
    chain: base,
    transport: custom(window.ethereum as never),
  });
}

export function hashMetadata(metadata: Record<string, unknown>): `0x${string}` {
  const json = JSON.stringify(metadata, Object.keys(metadata).sort());
  return keccak256(toHex(json));
}

export function verificationCode(hash: `0x${string}`): string {
  return hash.slice(2, 14).toUpperCase();
}

export async function waitForListingId(hash: Hash): Promise<string> {
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: ESCROW_EVENT_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === "Listed") {
        return decoded.args.listingId.toString();
      }
    } catch {
      // Ignore unrelated logs
    }
  }
  throw new Error("Listing transaction confirmed, but no Listed event was found.");
}

export async function waitForDealId(hash: Hash): Promise<string> {
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: ESCROW_EVENT_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === "DealListed") {
        return decoded.args.dealId.toString();
      }
    } catch {
      // Ignore unrelated logs
    }
  }
  throw new Error("Deal transaction confirmed, but no DealListed event was found.");
}

export function parseContractError(err: unknown): string {
  if (!err) return "Unknown error";

  const msg = typeof err === "string" ? err
    : (err as { message?: string }).message
    || (err as { shortMessage?: string }).shortMessage
    || String(err);

  const lower = msg.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected by user")) {
    return "Transaction rejected in wallet.";
  }
  if (lower.includes("4001") || lower.includes("action rejected")) {
    return "Transaction rejected in wallet.";
  }
  if (lower.includes("no wallet available") || lower.includes("window.ethereum")) {
    return "No wallet detected. Install MetaMask or Rainbow.";
  }
  if (lower.includes("network") || lower.includes("chain")) {
    return "Wrong network. Switch to Base in your wallet.";
  }
  if (lower.includes("insufficient funds") || lower.includes("insufficient balance")) {
    return "Insufficient ETH balance to complete this transaction.";
  }

  if (lower.includes("notnfrowner")) return "You don't own this NFT.";
  if (lower.includes("notborrower")) return "Only the borrower can perform this action.";
  if (lower.includes("notlender")) return "Only the lender can perform this action.";
  if (lower.includes("notadmin")) return "Only the admin can perform this action.";
  if (lower.includes("invalidstage")) return "This action is not allowed at the current stage.";
  if (lower.includes("deadlinenotpassed")) return "The deadline has not passed yet.";
  if (lower.includes("offerexpired")) return "This offer has expired.";
  if (lower.includes("alreadyoffered")) return "You already have an active offer on this listing.";
  if (lower.includes("transferfailed")) return "Transfer failed. Contact support.";
  if (lower.includes("paused")) return "Contract is paused. Check back shortly.";
  if (lower.includes("offermismatch")) return "The accepted terms don't match your original offer.";
  if (lower.includes("must send eth") || lower.includes("msg.value")) return "ETH amount is required.";

  if (lower.includes("next_public_escrow_contract")) {
    return "Escrow contract not configured. Set NEXT_PUBLIC_ESCROW_CONTRACT in .env";
  }

  const revertMatch = msg.match(/reverted with the following reason:\s*(.+?)(?:\n|$|")/);
  if (revertMatch) return revertMatch[1].trim();

  const short = msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
  return short;
}
