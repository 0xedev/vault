import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  fallback,
  http,
  keccak256,
  parseAbi,
  parseUnits,
  toHex,
  type Address,
  type Hash,
} from "viem";
import { getCallsStatus, sendCalls } from "viem/actions";
import { base } from "viem/chains";
import { ESCROW_ABI } from "./contract-abi";

export type WalletProviderLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type ContractCall = {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

type ContractCallReceipt = {
  hash: Hash;
  status: "success" | "failure";
};

export type ContractCallsResult = {
  id: string;
  status: "pending" | "success" | "failure";
  receipts: ContractCallReceipt[];
};

const ESCROW_EVENT_ABI = parseAbi([
  "event Listed(uint256 indexed listingId, address borrower, address nftContract, uint256 tokenId, uint256 amount, uint256 apr, uint256 term)",
  "event DealListed(uint256 indexed dealId, address seller, uint256 price, bytes32 metadataHash)",
]);

let activeWalletProvider: WalletProviderLike | null = null;
let switchPromise: Promise<void> | null = null;

export function setActiveWalletProvider(provider: WalletProviderLike | null) {
  activeWalletProvider = provider;
  switchPromise = null;
}

export function getActiveWalletProvider(): WalletProviderLike | null {
  if (activeWalletProvider) return activeWalletProvider;
  if (typeof window !== "undefined" && window.ethereum) {
    return window.ethereum as WalletProviderLike;
  }
  return null;
}

async function switchToBase() {
  const provider = getActiveWalletProvider();
  if (!provider) return;
  if (switchPromise) return switchPromise;
  switchPromise = (async () => {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      });
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      if (code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x2105",
              chainName: "Base",
              rpcUrls: ["https://mainnet.base.org"],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://basescan.org"],
            },
          ],
        });
      }
    } finally {
      switchPromise = null;
    }
  })();
  return switchPromise;
}

export function getEscrowAddress(): Address {
  const addr = process.env.NEXT_PUBLIC_ESCROW_CONTRACT;
  if (!addr) throw new Error("NEXT_PUBLIC_ESCROW_CONTRACT not set");
  return addr as Address;
}

export function getUSDCAddress(): Address {
  return "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
}

let _nftAddress: Address | null = null;
let _dealsAddress: Address | null = null;

export async function getNftAddress(): Promise<Address> {
  if (_nftAddress) return _nftAddress;
  const client = getPublicClient();
  _nftAddress = (await client.readContract({
    address: getEscrowAddress(),
    abi: ESCROW_ABI,
    functionName: "nft",
  })) as Address;
  return _nftAddress;
}

export async function getDealsAddress(): Promise<Address> {
  if (_dealsAddress) return _dealsAddress;
  const client = getPublicClient();
  _dealsAddress = (await client.readContract({
    address: getEscrowAddress(),
    abi: ESCROW_ABI,
    functionName: "deals",
  })) as Address;
  return _dealsAddress;
}

export function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(),
  });
}

export function getWalletClient() {
  const provider = getActiveWalletProvider();
  if (!provider) {
    throw new Error("No wallet available");
  }
  const client = createWalletClient({
    chain: base,
    transport: fallback([custom(provider as never), http()]),
  });
  const origWrite = client.writeContract.bind(client);
  client.writeContract = ((args: Parameters<typeof origWrite>[0]) => {
    return switchToBase()
      .catch((err: unknown) => {
        const code = (err as { code?: number }).code;
        if (code === 4001) throw err;
      })
      .then(() => origWrite(args));
  }) as typeof origWrite;
  return client;
}

async function waitForCallsResult(id: string): Promise<ContractCallsResult> {
  const client = getWalletClient();
  const status = await getCallsStatus(client, { id });
  const receipts: ContractCallReceipt[] = (status.receipts || []).map(
    (receipt) => ({
      hash: receipt.transactionHash,
      status: receipt.status === "success" ? "success" : ("failure" as const),
    }),
  );
  return {
    id: status.id,
    status: status.status ?? "pending",
    receipts,
  };
}

function shouldFallbackToWriteContract(err: unknown): boolean {
  const error = err as { name?: string; message?: string; details?: string };
  const msg = (error.message || error.details || "").toLowerCase();
  const name = (error.name || "").toLowerCase();
  return [
    "methodnotfoundrpcerror",
    "methodnotsupportrpcerror",
    "unknownrpcerror",
    "wallet_sendcalls",
    "sendcalls",
    "wallet_sendcall",
    "eip-5792",
    "eip5792",
  ].some((text) => name.includes(text) || msg.includes(text));
}

export async function sendContractCalls(
  account: Address,
  calls: ContractCall[],
  options?: { forceAtomic?: boolean },
): Promise<ContractCallsResult> {
  if (calls.length === 0) {
    throw new Error("No contract calls provided.");
  }

  const client = getWalletClient();
  const callInputs = calls.map((call) => ({
    to: call.address,
    abi: call.abi,
    functionName: call.functionName,
    args: call.args,
    ...(call.value === undefined ? {} : { value: call.value }),
  }));

  try {
    const result = await sendCalls(client, {
      account,
      chain: base,
      calls: callInputs,
      experimental_fallback: true,
      forceAtomic: options?.forceAtomic ?? false,
    });
    return waitForCallsResult(result.id);
  } catch (err) {
    if (shouldFallbackToWriteContract(err)) {
      const hashes = await Promise.all(
        calls.map((call) =>
          client.writeContract({
            address: call.address,
            abi: call.abi,
            functionName: call.functionName,
            args: call.args,
            account,
            chain: base,
          }),
        ),
      );
      return {
        id: hashes.join(","),
        status: "pending",
        receipts: hashes.map((hash) => ({ hash, status: "success" })),
      };
    }
    throw err;
  }
}

export function hashMetadata(metadata: Record<string, unknown>): `0x${string}` {
  const json = JSON.stringify(metadata, Object.keys(metadata).sort());
  return keccak256(toHex(json));
}

export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, 6);
}

export async function waitForListingId(hash: Hash): Promise<string> {
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: ESCROW_EVENT_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "Listed") {
        return decoded.args.listingId.toString();
      }
    } catch {
      // Ignore unrelated logs
    }
  }
  throw new Error(
    "Listing transaction confirmed, but no Listed event was found.",
  );
}

export async function waitForDealId(hash: Hash): Promise<string> {
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: ESCROW_EVENT_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "DealListed") {
        return decoded.args.dealId.toString();
      }
    } catch {
      // Ignore unrelated logs
    }
  }
  throw new Error(
    "Deal transaction confirmed, but no DealListed event was found.",
  );
}

export function parseContractError(err: unknown): string {
  if (!err) return "Unknown error";

  const msg =
    typeof err === "string"
      ? err
      : (err as { message?: string }).message ||
        (err as { shortMessage?: string }).shortMessage ||
        String(err);

  const lower = msg.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected by user")
  ) {
    return "Transaction rejected in wallet.";
  }
  if (lower.includes("4001") || lower.includes("action rejected")) {
    return "Transaction rejected in wallet.";
  }
  if (
    lower.includes("no wallet available") ||
    lower.includes("window.ethereum")
  ) {
    return "No wallet detected. Install MetaMask or Rainbow.";
  }
  if (lower.includes("network") || lower.includes("chain")) {
    return "Wrong network. Switch to Base in your wallet.";
  }
  if (
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance")
  ) {
    return "Insufficient USDC balance to complete this transaction.";
  }

  if (lower.includes("notnfrowner")) return "You don't own this NFT.";
  if (lower.includes("notborrower"))
    return "Only the borrower can perform this action.";
  if (lower.includes("notlender"))
    return "Only the lender can perform this action.";
  if (lower.includes("notadmin"))
    return "Only the admin can perform this action.";
  if (lower.includes("invalidstage"))
    return "This action is not allowed at the current stage.";
  if (lower.includes("deadlinenotpassed"))
    return "The deadline has not passed yet.";
  if (lower.includes("offerexpired")) return "This offer has expired.";
  if (lower.includes("alreadyoffered"))
    return "You already have an active offer on this listing.";
  if (lower.includes("transferfailed"))
    return "Transfer failed. Contact support.";
  if (lower.includes("paused"))
    return "Contract is paused. Check back shortly.";
  if (lower.includes("offermismatch"))
    return "The accepted terms don't match your original offer.";

  if (lower.includes("next_public_escrow_contract")) {
    return "Escrow contract not configured. Set NEXT_PUBLIC_ESCROW_CONTRACT in .env";
  }

  const revertMatch = msg.match(
    /reverted with the following reason:\s*(.+?)(?:\n|$|")/,
  );
  if (revertMatch) return revertMatch[1].trim();

  const short = msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
  return short;
}

/* USDC helpers */

const USDC_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export async function writeApproveUsdc(
  account: Address,
  spender: Address,
  amount: bigint,
): Promise<Hash> {
  const wallet = getWalletClient();
  return wallet.writeContract({
    address: getUSDCAddress(),
    abi: USDC_ABI,
    functionName: "approve",
    args: [spender, amount],
    account,
    chain: base,
  });
}
