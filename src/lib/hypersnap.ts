const HYPERSNAP_READ_BASE = "https://haatz.quilibrium.com";

export type HypersnapUser = {
  fid?: number | null;
  username?: string | null;
  display_name?: string | null;
  pfp_url?: string | null;
  follower_count?: number | null;
  power_badge?: boolean | null;
  verified_addresses?: {
    eth_addresses?: string[] | null;
  } | null;
};

type HypersnapBulkUsersResponse = {
  users?: HypersnapUser[];
};

type HypersnapUserResponse = {
  user?: HypersnapUser;
};

export type AddressDisplay = {
  address: string;
  name: string;
  username?: string;
  displayName?: string;
};

function cleanAddress(address: unknown) {
  return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address)
    ? address.toLowerCase()
    : "";
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function resolveHypersnapNames(addresses: unknown[]): Promise<Record<string, AddressDisplay>> {
  const unique = [...new Set(addresses.map(cleanAddress).filter(Boolean))];
  if (unique.length === 0) return {};

  const fallback = Object.fromEntries(
    unique.map((address) => [address, { address, name: shortAddress(address) }]),
  ) as Record<string, AddressDisplay>;

  const url = new URL("/v2/farcaster/user/bulk-by-address", HYPERSNAP_READ_BASE);
  url.searchParams.set("addresses", unique.join(","));

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    const json = await res.json().catch(() => ({})) as HypersnapBulkUsersResponse;
    for (const user of json.users || []) {
      const name = user.display_name || user.username;
      if (!name) continue;
      for (const address of user.verified_addresses?.eth_addresses || []) {
        const normalized = cleanAddress(address);
        if (!normalized || !fallback[normalized]) continue;
        fallback[normalized] = {
          address: normalized,
          name,
          username: user.username || undefined,
          displayName: user.display_name || undefined,
        };
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function lookupHypersnapUserByFid(fid: number): Promise<HypersnapUser | null> {
  if (!Number.isInteger(fid) || fid <= 0) return null;

  const url = new URL("/v2/farcaster/user", HYPERSNAP_READ_BASE);
  url.searchParams.set("fid", String(fid));

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({})) as HypersnapUserResponse;
    return json.user || null;
  } catch {
    return null;
  }
}
