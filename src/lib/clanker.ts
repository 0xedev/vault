import { asNumber, asString, jsonRecord } from "@/lib/api";
import type { ClankerToken } from "@/lib/data";
import { Clanker } from "clanker-sdk/v4";
import { createPublicClient, fallback, formatUnits, http, type Chain } from "viem";
import { arbitrum, base, baseSepolia, bsc, mainnet, optimism } from "viem/chains";

const CLANKER_BASE = "https://clanker.world/api";

type ClankerRawToken = Record<string, unknown>;
type OwnershipSignal = {
  source: "public" | "sdk_rewards" | "sdk_admin" | "clanker_api";
  detail: string;
};
type SdkTokenDetails = {
  signals: OwnershipSignal[];
  availableRewards: number;
  vaultClaimable: number;
};
type ClankerTransferVerificationInput = {
  tokenAddress: string;
  buyerAddress: string;
  chainId?: number;
  saleRights: string[];
  remainingSupply?: number;
  vaultedAmount?: number;
};
type TransferCheck = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

const ERC20_READ_ABI = [
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const TOKEN_ADMIN_READ_ABI = [
  {
    type: "function",
    name: "admin",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

function clankerApiKey() {
  return process.env.CLANKER_API_KEY || "";
}

function normalizeAddress(value: unknown) {
  return String(value || "").toLowerCase();
}

function isAddress(value: unknown): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ""));
}

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return jsonRecord(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return jsonRecord(value);
}

async function clankerFetch(path: string, params: Record<string, string>, authenticated = false) {
  const url = new URL(`${CLANKER_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {};
  const key = clankerApiKey();
  if (authenticated) {
    if (!key) return null;
    headers["x-api-key"] = key;
  }

  const res = await fetch(url, { headers, next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

function tokenAddress(token: ClankerRawToken) {
  return normalizeAddress(token.contract_address || token.contractAddress || token.tokenAddress);
}

function tokenOwnerMatches(token: ClankerRawToken, ownerAddress: string) {
  const owner = normalizeAddress(ownerAddress);

  return [
    token.admin,
    token.msg_sender,
    token.deployer,
    token.requestor_address,
    token.owner,
  ].some((value) => normalizeAddress(value) === owner);
}

function ownerSignalsFromPublicData(token: ClankerRawToken, ownerAddress: string): OwnershipSignal[] {
  const owner = normalizeAddress(ownerAddress);
  const signals: OwnershipSignal[] = [];

  if (normalizeAddress(token.msg_sender) === owner) {
    signals.push({ source: "public", detail: "Connected wallet matches token deployer." });
  }
  if (normalizeAddress(token.admin) === owner) {
    signals.push({ source: clankerApiKey() ? "clanker_api" : "public", detail: "Connected wallet matches token admin." });
  }

  return signals;
}

function chainForId(chainId: number): Chain {
  const chains: Record<number, Chain> = {
    1: mainnet,
    10: optimism,
    56: bsc,
    42161: arbitrum,
    8453: base,
    84532: baseSepolia,
  };
  return chains[chainId] || base;
}

function rpcForChain(chainId: number) {
  const envKey = `CHAIN_${chainId}_RPC_URL`;
  return process.env[envKey] || process.env.BASE_RPC_URL || undefined;
}

function rpcTransportsForChain(chainId: number) {
  const explicitRpc = rpcForChain(chainId);
  const alchemyRpc =
    chainId === base.id && process.env.ALCHEMY_KEY
      ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
      : "";
  const primaryRpc = alchemyRpc || explicitRpc;
  const publicRpc = chainId === base.id ? "https://mainnet.base.org" : "";

  if (primaryRpc && publicRpc && primaryRpc !== publicRpc) {
    return fallback([http(primaryRpc), http(publicRpc)]);
  }
  return http(primaryRpc || undefined);
}

function clankerForChain(chainId: number) {
  const chain = chainForId(chainId);
  return new Clanker({
    publicClient: createPublicClient({
      chain,
      transport: rpcTransportsForChain(chain.id),
    }),
  });
}

function publicClientForChain(chainId: number) {
  const chain = chainForId(chainId);
  return createPublicClient({
    chain,
    transport: rpcTransportsForChain(chain.id),
  });
}

function asAddressArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function parseRewardsInfo(value: unknown) {
  if (!value || typeof value !== "object") return { rewardAdmins: [], rewardRecipients: [] };
  const record = value as Record<string, unknown>;
  return {
    rewardAdmins: asAddressArray(record.rewardAdmins),
    rewardRecipients: asAddressArray(record.rewardRecipients),
  };
}

function weiToEth(value: bigint) {
  return Number(value) / 1e18;
}

export function selectedRights(rights: string[]) {
  const full = rights.includes("full_package");
  return {
    feeRights: full || rights.includes("fee_rights"),
    adminRights: full || rights.includes("admin_rights"),
    vaultedTokens: full || rights.includes("vaulted_tokens"),
    remainingSupply: full || rights.includes("remaining_supply"),
  };
}

async function readTokenBalance(token: `0x${string}`, holder: `0x${string}`, chainId: number) {
  const client = publicClientForChain(chainId);
  const [decimals, balance] = await Promise.all([
    client.readContract({ address: token, abi: ERC20_READ_ABI, functionName: "decimals" }),
    client.readContract({ address: token, abi: ERC20_READ_ABI, functionName: "balanceOf", args: [holder] }),
  ]);
  return Number(formatUnits(balance, decimals));
}

async function buyerHasTokenAdmin(token: `0x${string}`, buyer: `0x${string}`, chainId: number) {
  const client = publicClientForChain(chainId);
  const reads = await Promise.allSettled([
    client.readContract({ address: token, abi: TOKEN_ADMIN_READ_ABI, functionName: "admin" }),
    client.readContract({ address: token, abi: TOKEN_ADMIN_READ_ABI, functionName: "owner" }),
  ]);
  return reads.some((result) => result.status === "fulfilled" && normalizeAddress(result.value) === normalizeAddress(buyer));
}

async function sdkTokenDetails(token: ClankerRawToken, ownerAddress: string): Promise<SdkTokenDetails> {
  const owner = normalizeAddress(ownerAddress);
  const address = tokenAddress(token);
  if (!isAddress(address)) return { signals: [], availableRewards: 0, vaultClaimable: 0 };

  const chainId = asNumber(token.chain_id, 8453);
  const clanker = clankerForChain(chainId);
  const signals: OwnershipSignal[] = [];
  let availableRewards = 0;
  let vaultClaimable = 0;

  try {
    const rewards = parseRewardsInfo(await clanker.getTokenRewards({ token: address }));
    if (rewards.rewardAdmins.some((value) => normalizeAddress(value) === owner)) {
      signals.push({ source: "sdk_rewards", detail: "Connected wallet can administer token rewards." });
    }
    if (rewards.rewardRecipients.some((value) => normalizeAddress(value) === owner)) {
      signals.push({ source: "sdk_rewards", detail: "Connected wallet receives token rewards." });
    }
  } catch {
    // Older tokens or unsupported chains may not expose v4 rewards.
  }

  try {
    const available = await clanker.availableRewards({ token: address, rewardRecipient: owner as `0x${string}` });
    availableRewards = weiToEth(available);
    if (available > BigInt(0)) {
      signals.push({ source: "sdk_rewards", detail: "Connected wallet has available token rewards." });
    }
  } catch {
    // Reward availability is best-effort enrichment.
  }

  try {
    vaultClaimable = weiToEth(await clanker.getVaultClaimableAmount({ token: address }));
  } catch {
    // Vault availability is best-effort enrichment.
  }

  try {
    const admin = await clanker.publicClient?.readContract({
      address,
      abi: [{
        type: "function",
        name: "admin",
        inputs: [],
        outputs: [{ type: "address" }],
        stateMutability: "view",
      }],
      functionName: "admin",
    });
    if (normalizeAddress(admin) === owner) {
      signals.push({ source: "sdk_admin", detail: "Connected wallet is token admin on-chain." });
    }
  } catch {
    // Not all Clanker token versions expose admin() the same way.
  }

  return { signals, availableRewards, vaultClaimable };
}

export function mapClankerApiToken(token: ClankerRawToken): ClankerToken & { ownerVerified?: boolean } {
  const deployConfig = parseMaybeJson(token.deploy_config);
  const market = jsonRecord(jsonRecord(token.related).market);
  const chainId = asNumber(token.chain_id, 8453);
  const supply = asNumber(token.supply) / 1e18;
  const lockupPercentage = asNumber(deployConfig.lockupPercentage);
  const vestingUnlock = asNumber(deployConfig.vestingUnlockDate);
  const claimedFeesWei = asNumber(token.totalClaimed);

  return {
    id: asString(token.id, tokenAddress(token)),
    name: asString(token.name, "Untitled token"),
    symbol: asString(token.symbol, ""),
    tokenAddress: asString(token.contract_address || token.contractAddress || token.tokenAddress),
    chain: chainId === 8453 ? "Base" : String(chainId),
    totalSupply: supply || asNumber(token.totalSupply),
    remainingSupply: asNumber(token.remainingSupply),
    vaultedAmount: asNumber(token.vaultedAmount) || (supply && lockupPercentage ? (supply * lockupPercentage) / 100 : 0),
    vaultUnlock: vestingUnlock ? new Date(vestingUnlock * 1000).toISOString().slice(0, 10) : "",
    feeEarnings: asNumber(token.userRewards) || asNumber(market.volume24h) || (claimedFeesWei ? claimedFeesWei / 1e18 : 0),
    price: 0,
    poolAddress: asString(token.pool_address || token.poolAddress),
    imageUrl: asString(token.img_url || token.imageUrl),
    verified: !Array.isArray(token.warnings) || token.warnings.length === 0,
    chainId,
    txHash: asString(token.tx_hash),
    txStatus: "confirmed",
    contractAddress: asString(token.contract_address || token.contractAddress),
  };
}

function dedupeTokens(tokens: ClankerRawToken[]) {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    const address = tokenAddress(token);
    if (!address || seen.has(address)) return false;
    seen.add(address);
    return true;
  });
}

export async function getClankerTokensForOwner(ownerAddress: string) {
  const owner = normalizeAddress(ownerAddress);
  const responses = await Promise.all([
    clankerFetch("/search-creator", { q: owner, limit: "50", trustedOnly: "false" }),
    clankerFetch("/tokens/fetch-deployed-by-address", { address: owner }, true),
    clankerFetch("/tokens/fetch-by-admin", { admin: owner, limit: "100" }, true),
  ]);

  const raw = responses.flatMap((data) => {
    if (!data) return [];
    if (Array.isArray(data.tokens)) return data.tokens;
    if (Array.isArray(data.data)) return data.data;
    return [];
  }) as ClankerRawToken[];

  const tokens = dedupeTokens(raw);
  const verified = await Promise.all(tokens.map(async (token) => {
    const publicSignals = ownerSignalsFromPublicData(token, owner);
    const sdk = await sdkTokenDetails(token, owner);
    const signals = [...publicSignals, ...sdk.signals];
    const mapped = mapClankerApiToken(token);
    if (sdk.availableRewards > 0) mapped.feeEarnings = sdk.availableRewards;
    if (sdk.vaultClaimable > 0) mapped.vaultedAmount = sdk.vaultClaimable;
    return signals.length ? { ...mapped, ownerVerified: true, ownershipSignals: signals } : null;
  }));

  return verified.filter((token): token is NonNullable<typeof token> => token !== null);
}

export async function getClankerTokenByAddress(contractAddress: string) {
  const address = normalizeAddress(contractAddress);
  const authenticated = await clankerFetch("/get-clanker-by-address", { address }, true);
  const token = jsonRecord(authenticated).data as ClankerRawToken | undefined;
  if (token && tokenAddress(token) === address) return token;

  const publicSearch = await clankerFetch("/tokens", {
    q: address,
    limit: "1",
    includeMarket: "true",
    includeUser: "true",
  });
  const publicToken = Array.isArray(publicSearch?.data) ? publicSearch.data[0] as ClankerRawToken : null;
  return publicToken && tokenAddress(publicToken) === address ? publicToken : null;
}

export async function verifyClankerTokenOwnership(ownerAddress: string, contractAddress: string) {
  const owner = normalizeAddress(ownerAddress);
  const contract = normalizeAddress(contractAddress);
  const ownedTokens = await getClankerTokensForOwner(owner);
  const owned = ownedTokens.find((token) => normalizeAddress(token.tokenAddress) === contract);
  if (owned) return { verified: true, token: owned };

  const token = await getClankerTokenByAddress(contract);
  if (!token) return { verified: false, reason: "Clanker token was not found." };
  const sdk = await sdkTokenDetails(token, owner);
  const signals = [
    ...ownerSignalsFromPublicData(token, owner),
    ...sdk.signals,
  ];
  if (!tokenOwnerMatches(token, owner) && signals.length === 0) {
    return { verified: false, reason: "This wallet is not the token deployer, admin, reward recipient, or owner." };
  }

  const mapped = mapClankerApiToken(token);
  if (sdk.availableRewards > 0) mapped.feeEarnings = sdk.availableRewards;
  if (sdk.vaultClaimable > 0) mapped.vaultedAmount = sdk.vaultClaimable;
  return { verified: true, token: { ...mapped, ownerVerified: true, ownershipSignals: signals } };
}

export async function verifyClankerRightsTransferred(input: ClankerTransferVerificationInput) {
  const token = normalizeAddress(input.tokenAddress);
  const buyer = normalizeAddress(input.buyerAddress);
  const chainId = input.chainId || 8453;
  const checks: TransferCheck[] = [];

  if (!isAddress(token) || !isAddress(buyer)) {
    return {
      verified: false,
      checks: [{
        key: "addresses",
        label: "Transfer addresses",
        ok: false,
        detail: "A valid Clanker token address and buyer wallet are required.",
      }],
      reason: "A valid Clanker token address and buyer wallet are required.",
    };
  }

  const rights = selectedRights(input.saleRights);
  const clanker = clankerForChain(chainId);
  let rewards: ReturnType<typeof parseRewardsInfo> = { rewardAdmins: [], rewardRecipients: [] };
  try {
    rewards = parseRewardsInfo(await clanker.getTokenRewards({ token }));
  } catch {
    // Some legacy tokens may not expose v4 reward data.
  }

  if (rights.feeRights) {
    const ok = rewards.rewardRecipients.some((recipient) => normalizeAddress(recipient) === buyer);
    checks.push({
      key: "fee_rights",
      label: "Creator fee rights",
      ok,
      detail: ok ? "Buyer is now a Clanker reward recipient." : "Buyer is not a Clanker reward recipient yet.",
    });
  }

  if (rights.adminRights) {
    const rewardAdmin = rewards.rewardAdmins.some((admin) => normalizeAddress(admin) === buyer);
    const tokenAdmin = await buyerHasTokenAdmin(token, buyer, chainId).catch(() => false);
    checks.push({
      key: "admin_rights",
      label: "Admin rights",
      ok: rewardAdmin || tokenAdmin,
      detail: rewardAdmin || tokenAdmin
        ? "Buyer controls token ownership/admin or Clanker reward admin rights."
        : "Buyer does not control token ownership/admin or reward admin rights yet.",
    });
  }

  const remainingRequired = rights.remainingSupply ? asNumber(input.remainingSupply) : 0;
  const vaultedRequired = rights.vaultedTokens ? asNumber(input.vaultedAmount) : 0;
  const totalTokenRequired = remainingRequired + vaultedRequired;
  if (rights.remainingSupply || rights.vaultedTokens) {
    let balance = 0;
    try {
      balance = await readTokenBalance(token, buyer, chainId);
    } catch {
      checks.push({
        key: "token_balance",
        label: "Token balance",
        ok: false,
        detail: "Unable to read buyer token balance.",
      });
    }

    if (rights.remainingSupply) {
      checks.push({
        key: "remaining_supply",
        label: "Remaining supply",
        ok: remainingRequired <= 0 || balance >= remainingRequired,
        detail: remainingRequired <= 0
          ? "No remaining supply amount was listed."
          : `Buyer balance is ${balance.toLocaleString()} tokens; required at least ${remainingRequired.toLocaleString()}.`,
      });
    }

    if (rights.vaultedTokens) {
      checks.push({
        key: "vaulted_tokens",
        label: "Vaulted tokens",
        ok: vaultedRequired <= 0 || balance >= totalTokenRequired,
        detail: vaultedRequired <= 0
          ? "No vaulted token amount was listed."
          : `Buyer balance is ${balance.toLocaleString()} tokens; required ${totalTokenRequired.toLocaleString()} after all token transfers.`,
      });
    }
  }

  const failed = checks.filter((check) => !check.ok);
  return {
    verified: failed.length === 0,
    checks,
    reason: failed.length ? failed.map((check) => `${check.label}: ${check.detail}`).join(" ") : undefined,
  };
}
