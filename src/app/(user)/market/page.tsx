"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/icons";
import LoanCard from "@/components/LoanCard";
import Dropdown from "@/components/Dropdown";
import NFTArt from "@/components/NFTArt";
import { COLLECTIONS } from "@/lib/data";
import { useWallet } from "@/components/WalletProvider";
import {
  approveNft,
  getNftAddress,
  writeListNFT,
  waitForListingId,
  parseContractError,
  readPlatformFeeBps,
} from "@/lib/contract";
import { getActiveWalletProvider } from "@/lib/contract-helpers";
import { parseUnits } from "viem";
import type {
  ClankerToken,
  FarcasterAccount,
  Loan,
  MiniApp,
  XAccount,
  BundleListing,
} from "@/lib/data";
import BundleCard from "@/components/BundleCard";
import ListBundleModal from "@/components/ListBundleModal";
import ListMiniAppModal from "@/components/ListMiniAppModal";
import ListXModal from "@/components/ListXModal";
import ListFidModal from "@/components/ListFidModal";

type LoanWithSeller = Loan & { sellerAddress?: string };
type MarketTab =
  | "all"
  | "nft"
  | "miniapps"
  | "x"
  | "farcaster"
  | "clanker"
  | "bundles";

const marketTabs: { key: MarketTab; label: string }[] = [
  { key: "all", label: "All Markets" },
  { key: "nft", label: "NFT Loans" },
  { key: "miniapps", label: "Mini Apps" },
  { key: "x", label: "X Accounts" },
  { key: "farcaster", label: "Farcaster" },
  { key: "clanker", label: "Clanker" },
  { key: "bundles", label: "Bundles" },
];

function ListNFTModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [step, setStep] = useState(0);
  const [collection, setCollection] = useState("Meridian Genesis");
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [apr, setApr] = useState("14.2");
  const [term, setTerm] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [detectedNfts, setDetectedNfts] = useState<
    {
      collection: string;
      tokenId: string;
      seed: number;
      value: number;
      contractAddress: string;
      imageUrl: string;
    }[]
  >([]);
  const [selectedContract, setSelectedContract] = useState("");
  const [selectedNftImageUrl, setSelectedNftImageUrl] = useState("");
  const [scanning, setScanning] = useState(true);
  const [collSeed] = useState(() => Math.floor(Math.random() * 100));
  const [nftPlatformFeeBps, setNftPlatformFeeBps] = useState(500);

  useEffect(() => {
    readPlatformFeeBps("nft").then(setNftPlatformFeeBps).catch(() => {});
  }, []);

  const [tooltip, setTooltip] = useState("");

  // Auto-detect NFTs when modal opens
  useEffect(() => {
    if (!address) return;
    queueMicrotask(() => setScanning(true));
    fetch(`/api/nfts/${address}?chain=base`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch NFTs");
        const json = await res.json();
        const nfts = (json.data || []) as {
          contract: { address: string; name?: string };
          tokenId: string;
          name?: string;
          floorPriceEth?: number;
          collection?: { name?: string };
          image?: { cachedUrl?: string; thumbnailUrl?: string };
        }[];
        const found = nfts
          .filter((n) => n.name || n.collection?.name)
          .slice(0, 20)
          .map((n) => ({
            collection: n.collection?.name || n.contract.name || "Unknown",
            tokenId: n.tokenId.includes("#") ? n.tokenId : `#${n.tokenId}`,
            seed: parseInt(n.tokenId) || Math.floor(Math.random() * 10000),
            value: n.floorPriceEth || 0,
            contractAddress: n.contract.address,
            imageUrl: n.image?.thumbnailUrl || n.image?.cachedUrl || "",
          }));
        setDetectedNfts(found);
        setScanning(false);
      })
      .catch(() => {
        setError("Could not fetch NFTs. Make sure your wallet is on Base.");
        setScanning(false);
      });
  }, [address]);

  const refetchNfts = async () => {
    if (!address) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/nfts/${address}?chain=base`);
      if (!res.ok) throw new Error("Failed to fetch NFTs");
      const json = await res.json();
      const nfts = (json.data || []) as {
        contract: { address: string; name?: string };
        tokenId: string;
        name?: string;
        floorPriceEth?: number;
        collection?: { name?: string };
        image?: { cachedUrl?: string; thumbnailUrl?: string };
      }[];
      const found = nfts
        .filter((n) => n.name || n.collection?.name)
        .slice(0, 20)
        .map((n) => ({
          collection: n.collection?.name || n.contract.name || "Unknown",
          tokenId: n.tokenId.includes("#") ? n.tokenId : `#${n.tokenId}`,
          seed: parseInt(n.tokenId) || Math.floor(Math.random() * 10000),
          value: n.floorPriceEth || 0,
          contractAddress: n.contract.address,
          imageUrl: n.image?.thumbnailUrl || n.image?.cachedUrl || "",
        }));
      setDetectedNfts(found);
    } catch {
      setError("Could not fetch NFTs. Make sure your wallet is on Base.");
    }
    setScanning(false);
  };

  const canContinue = collection && tokenId;
  const canReview =
    canContinue &&
    amount &&
    Number(amount) > 0 &&
    Number(apr) > 0 &&
    Number(term) > 0;
  const impliedLtv = canReview ? Math.round((Number(amount) / 15) * 100) : 0;
  const platformFee = Number(amount || 0) * nftPlatformFeeBps / 10000;

  const verifyOwnership = async () => {
    if (!address) return false;
    // NFT ownership was already confirmed by Alchemy during scan
    return detectedNfts.some(
      (n) => n.collection === collection && n.tokenId === tokenId,
    );
  };

  const handleReview = async () => {
    setError("");
    const owns = await verifyOwnership();
    if (!owns) {
      setError(
        "Ownership not confirmed. Make sure you own this NFT in the connected wallet.",
      );
      return;
    }
    setStep(1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      if (!address) throw new Error("Wallet not connected");

      // 1. Sign a message proving intent to list
      const provider = getActiveWalletProvider();
      if (provider) {
        const message = `List ${collection} ${tokenId} as collateral for ${amount} USDC loan at ${apr}% APR / ${term} days on Vault`;
        await provider.request({
          method: "personal_sign",
          params: [message, address],
        });
      }

      // 2. Approve NFT for escrow contract, then list on-chain
      const nftTokenId = BigInt(parseInt(tokenId.replace("#", "")) || collSeed);
      const amountWei = parseUnits(amount || "0", 6);
      const aprBps = Math.round(Number(apr) * 100); // e.g. 14.2 → 1420
      const termDays = Number(term);

      if (!selectedContract)
        throw new Error("Select a detected NFT before listing on-chain.");
      const escrowAddr = await getNftAddress();
      await approveNft(
        address as `0x${string}`,
        selectedContract as `0x${string}`,
        nftTokenId,
        escrowAddr,
      );
      const listTxHash = await writeListNFT(
        address as `0x${string}`,
        selectedContract as `0x${string}`,
        nftTokenId,
        amountWei,
        aprBps,
        termDays,
      );
      const contractListingId = await waitForListingId(listTxHash);

      // 3. POST to API
      const res = await fetch("/api/listings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `L-${Date.now()}`,
          seller: address || "0x0000",
          amount: Number(amount),
          apr: Number(apr),
          term: termDays,
          collection,
          tokenId,
          ltv: impliedLtv,
          imageUrl: selectedNftImageUrl,
          chainId: 8453,
          contractAddress: escrowAddr,
          contractListingId,
          txHash: listTxHash,
        }),
      });

      if (!res.ok) throw new Error("Listing failed");
      onClose();
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const selectNFT = (
    c: string,
    t: string,
    value: number,
    contractAddr: string,
    imageUrl: string,
  ) => {
    setCollection(c);
    setTokenId(t);
    setSelectedContract(contractAddr);
    setSelectedNftImageUrl(imageUrl);
    setAmount(value ? (value * 0.5).toFixed(1) : "");
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 500 }}
      >
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>
            {step === 0
              ? "Select your NFT"
              : step === 1
                ? "Set loan terms"
                : "Review & sign"}
          </h3>
          <button className="btn ghost sm" onClick={onClose}>
            <Icon.x />
          </button>
        </div>
        <div className="modal-b">
          {/* STEP 0 — Select NFT */}
          {step === 0 && (
            <div className="col" style={{ gap: 14 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Choose an NFT from your wallet to use as collateral for a loan.
              </p>

              <button
                className="btn"
                onClick={refetchNfts}
                style={{ width: "100%", justifyContent: "center" }}
                disabled={scanning}
              >
                {scanning ? (
                  <>Scanning your wallet…</>
                ) : (
                  <>
                    <Icon.search style={{ width: 14, height: 14 }} /> Rescan
                    NFTs
                  </>
                )}
              </button>

              {scanning ? (
                <div
                  className="muted"
                  style={{ padding: 20, textAlign: "center", fontSize: 13 }}
                >
                  Querying Base chain for your NFTs…
                </div>
              ) : detectedNfts.length === 0 ? (
                <div
                  className="muted"
                  style={{ padding: 16, textAlign: "center", fontSize: 12 }}
                >
                  No NFTs found in your wallet from supported collections. Make
                  sure your wallet is connected to Base.
                </div>
              ) : (
                <div
                  className="grid grid-2"
                  style={{ gap: 8, maxHeight: 200, overflowY: "auto" }}
                >
                  {detectedNfts.map((n, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        selectNFT(
                          n.collection,
                          n.tokenId,
                          n.value,
                          n.contractAddress,
                          n.imageUrl,
                        )
                      }
                      className="card"
                      style={{
                        padding: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        border:
                          collection === n.collection && tokenId === n.tokenId
                            ? "1px solid var(--accent)"
                            : undefined,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <NFTArt seed={n.seed} />
                      </div>
                      <div className="col" style={{ gap: 1 }}>
                        <span style={{ fontSize: 12 }}>{n.collection}</span>
                        <span className="mono muted" style={{ fontSize: 11 }}>
                          {n.tokenId}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div className="warn-banner" style={{ fontSize: 12 }}>
                  {error}
                </div>
              )}

              <button
                className="btn primary lg"
                style={{ width: "100%" }}
                disabled={!canContinue}
                onClick={handleReview}
              >
                Set loan terms →
              </button>
            </div>
          )}

          {/* STEP 1 — Set terms */}
          {step === 1 && (
            <div className="col" style={{ gap: 14 }}>
              <div
                className="card"
                style={{
                  padding: 12,
                  background: "var(--surface-2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <NFTArt
                    seed={parseInt(tokenId.replace("#", "")) || collSeed}
                  />
                </div>
                <div className="col" style={{ gap: 0 }}>
                  <span style={{ fontSize: 13 }}>{collection}</span>
                  <span className="mono muted" style={{ fontSize: 11 }}>
                    {tokenId}
                  </span>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 12 }}>
                <div>
                  <span className="label">Borrow amount (USDC)</span>
                  <input
                    className="input mono"
                    type="number"
                    step="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="8.4"
                  />
                </div>
                <div>
                  <span className="label">
                    APR (%){" "}
                    <span
                      style={{
                        cursor: "help",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                      onMouseEnter={() =>
                        setTooltip(
                          "APR is the annualized interest rate the borrower pays. A 14% APR on 8.4 USDC over 30 days means ~0.098 USDC in interest.",
                        )
                      }
                      onMouseLeave={() => setTooltip("")}
                    >
                      <svg
                        viewBox="0 0 14 14"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <circle cx="7" cy="7" r="5.5" />
                        <path d="M7 6.5V7" />
                        <circle cx="7" cy="10" r="0.4" fill="currentColor" />
                      </svg>
                    </span>
                  </span>
                  <input
                    className="input mono"
                    type="number"
                    step="0.1"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                  />
                </div>
                {tooltip && (
                  <div
                    className="card"
                    style={{
                      padding: 8,
                      fontSize: 11,
                      lineHeight: 1.4,
                      color: "var(--ink-2)",
                      background: "var(--surface-2)",
                    }}
                  >
                    {tooltip}
                  </div>
                )}
                <div>
                  <span className="label">Term (days)</span>
                  <input
                    className="input mono"
                    type="number"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  />
                </div>
                <div
                  className="col"
                  style={{ gap: 6, justifyContent: "flex-end" }}
                >
                  <span className="smallcaps">Implied LTV</span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 18,
                      color:
                        impliedLtv > 75
                          ? "var(--risk)"
                          : impliedLtv > 65
                            ? "var(--warn)"
                            : "var(--accent)",
                    }}
                  >
                    {impliedLtv}%
                  </span>
                </div>
              </div>

              {impliedLtv > 75 && (
                <div
                  className="warn-banner"
                  style={{
                    background: "rgba(255, 71, 71, 0.05)",
                    borderColor: "var(--risk)",
                    color: "var(--risk)",
                  }}
                >
                  <Icon.warn />
                  <div style={{ fontSize: 12 }}>
                    High LTV detected. Loans above 75% LTV are significantly
                    less likely to be funded by lenders.
                  </div>
                </div>
              )}

              <div className="row" style={{ gap: 8 }}>
                <button
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => setStep(0)}
                >
                  ← Back
                </button>
                <button
                  className="btn primary lg"
                  style={{ flex: 1 }}
                  disabled={!canReview}
                  onClick={() => setStep(2)}
                >
                  Review listing →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — Review & sign */}
          {step === 2 && (
            <div className="col" style={{ gap: 14 }}>
              <div
                className="card"
                style={{ padding: 14, background: "var(--surface-2)" }}
              >
                <div className="kv">
                  <span className="k">Collection</span>
                  <span className="v">{collection}</span>
                </div>
                <div className="kv">
                  <span className="k">Token ID</span>
                  <span className="v mono">{tokenId}</span>
                </div>
                <div className="kv">
                  <span className="k">Borrow amount</span>
                  <span className="v mono">{amount} USDC</span>
                </div>
                <div className="kv">
                  <span className="k">APR</span>
                  <span className="v mono">{apr}%</span>
                </div>
                <div className="kv">
                  <span className="k">Term</span>
                  <span className="v mono">{term} days</span>
                </div>
                <div className="kv">
                  <span className="k">Implied LTV</span>
                  <span
                    className="v mono"
                    style={{
                      color: impliedLtv > 65 ? "var(--warn)" : "var(--accent)",
                    }}
                  >
                    {impliedLtv}%
                  </span>
                </div>
                <div className="kv">
                  <span className="k">Platform fee ({nftPlatformFeeBps / 100}%)</span>
                  <span className="v mono">{platformFee.toFixed(3)} USDC</span>
                </div>
                <div className="kv">
                  <span className="k">You receive when funded</span>
                  <span className="v mono" style={{ color: "var(--accent)" }}>
                    {(Number(amount) - platformFee).toFixed(3)} USDC
                  </span>
                </div>
              </div>

              <div className="warn-banner" style={{ alignItems: "flex-start" }}>
                <Icon.warn style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>
                    Listing transfers your NFT to escrow.
                  </div>
                  <span className="muted-2">
                    Your NFT is locked in the escrow contract. You receive USDC
                    only when you accept a lender&apos;s offer. If you default,
                    the lender claims the NFT.
                  </span>
                </div>
              </div>

              {error && (
                <div
                  className="warn-banner"
                  style={{ fontSize: 12, color: "var(--risk)" }}
                >
                  {error}
                </div>
              )}

              <div className="row" style={{ gap: 8 }}>
                <button
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => setStep(1)}
                  disabled={submitting}
                >
                  ← Back
                </button>
                <button
                  className="btn primary lg"
                  style={{ flex: 1 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Signing…" : "Sign & list"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const searchParams = useSearchParams();
  const [activeMarket, setActiveMarket] = useState<MarketTab>("all");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [xAccounts, setXAccounts] = useState<XAccount[]>([]);
  const [farcaster, setFarcaster] = useState<FarcasterAccount[]>([]);
  const [clankerTokens, setClankerTokens] = useState<ClankerToken[]>([]);
  const [bundles, setBundles] = useState<BundleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("apr");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [showListModal, setShowListModal] = useState(false);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [chainLoading, setChainLoading] = useState(false);
  const [showOnChain, setShowOnChain] = useState(false);
  const { isConnected, connect, isConnecting, address } = useWallet();

  useEffect(() => {
    const tab = searchParams.get("tab") as MarketTab | null;
    if (tab && marketTabs.some((item) => item.key === tab)) {
      queueMicrotask(() => setActiveMarket(tab));
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/listings").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load listings");
        return (json.data || []) as Loan[];
      }),
      fetch("/api/marketplace/mini-apps").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load mini apps");
        return (json.data || []) as MiniApp[];
      }),
      fetch("/api/marketplace/x-accounts").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load X accounts");
        return (json.data || []) as XAccount[];
      }),
      fetch("/api/marketplace/farcaster").then(async (r) => {
        const json = await r.json();
        if (!r.ok)
          throw new Error(json.error || "Unable to load Farcaster listings");
        return (json.data || []) as FarcasterAccount[];
      }),
      fetch("/api/marketplace/clanker").then(async (r) => {
        const json = await r.json();
        if (!r.ok)
          throw new Error(json.error || "Unable to load Clanker listings");
        return (json.data || []) as ClankerToken[];
      }),
      fetch("/api/marketplace/bundles").then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load bundles");
        return (json.data || []) as BundleListing[];
      }),
    ]).then((results) => {
      if (results[0].status === "fulfilled") setLoans(results[0].value);
      if (results[1].status === "fulfilled") setMiniApps(results[1].value);
      if (results[2].status === "fulfilled") setXAccounts(results[2].value);
      if (results[3].status === "fulfilled") setFarcaster(results[3].value);
      if (results[4].status === "fulfilled") setClankerTokens(results[4].value);
      if (results[5].status === "fulfilled") setBundles(results[5].value);
      const failed = results.find((result) => result.status === "rejected");
      if (failed && results.every((result) => result.status === "rejected")) {
        setError(
          failed.reason instanceof Error
            ? failed.reason.message
            : "Unable to load marketplaces",
        );
      }
      setLoading(false);
    });
  }, []);

  const fetchOnChain = async () => {
    setChainLoading(true);
    setError("");
    try {
      const res = await fetch("/api/listings?chain=true&limit=50");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to read from chain");
      setLoans(json.data || []);
      setShowOnChain(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "On-chain read failed");
    } finally {
      setChainLoading(false);
    }
  };

  const fetchDbListings = () => {
    setShowOnChain(false);
    fetch("/api/listings")
      .then(async (r) => { const json = await r.json(); if (!r.ok) throw new Error(json.error); setLoans(json.data || []); })
      .catch(err => setError(err instanceof Error ? err.message : "Failed to load"));
  };

  const filtered = useMemo(() => {
    let r = loans.filter((l) => {
      if (filter === "all") return true;
      if (filter === "my")
        return (
          Boolean(address) &&
          (l as LoanWithSeller).sellerAddress?.toLowerCase() ===
            address?.toLowerCase()
        );
      return l.status === filter;
    });
    if (collectionFilter !== "all") {
      const collIdx = COLLECTIONS.indexOf(
        collectionFilter as (typeof COLLECTIONS)[number],
      );
      if (collIdx >= 0) r = r.filter((l) => l.coll === collIdx);
    }
    if (sort === "apr") r = [...r].sort((a, b) => b.apr - a.apr);
    if (sort === "amt") r = [...r].sort((a, b) => b.amt - a.amt);
    if (sort === "ltv") r = [...r].sort((a, b) => a.ltv - b.ltv);
    return r;
  }, [filter, sort, loans, collectionFilter, address]);

  const chipData: [string, string, number][] = [
    ["all", "All", loans.length],
    [
      "my",
      "My Listings",
      loans.filter(
        (l) =>
          Boolean(address) &&
          (l as LoanWithSeller).sellerAddress?.toLowerCase() ===
            address?.toLowerCase(),
      ).length,
    ],
    ["open", "Open", loans.filter((l) => l.status === "open").length],
    ["funded", "Funded", loans.filter((l) => l.status === "funded").length],
    ["warn", "At risk", loans.filter((l) => l.status === "warn").length],
    [
      "default",
      "Defaulted",
      loans.filter((l) => l.status === "default").length,
    ],
  ];

  const handleListClick = () => {
    if (!isConnected) {
      connect();
      return;
    }
    setShowListModal(true);
  };

  return (
    <main
      id="main-content"
      role="main"
      aria-label="Main content"
      className="main"
    >
      <div
        className="market-page-head row between"
        style={{ alignItems: "flex-end", marginBottom: 22 }}
      >
        <div>
          <div className="eyebrow">Marketplace</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            {activeMarket === "all" && "Browse every escrow market."}
            {activeMarket === "nft" && "NFT Loans"}
            {activeMarket === "miniapps" && "Mini Apps"}
            {activeMarket === "x" && "X Accounts"}
            {activeMarket === "farcaster" && "Farcaster"}
            {activeMarket === "clanker" && "Clanker Tokens"}
            {activeMarket === "bundles" && "Bundled Listings"}
          </h1>
        </div>
        {activeMarket === "all" && (
          <button
            className="btn primary"
            onClick={handleListClick}
            disabled={isConnecting}
          >
            {isConnected
              ? "List your NFT"
              : isConnecting
                ? "Connecting…"
                : "Connect & list"}
          </button>
        )}
        {activeMarket === "nft" && (
          <button
            className="btn primary"
            onClick={handleListClick}
            disabled={isConnecting}
          >
            {isConnected
              ? "List your NFT"
              : isConnecting
                ? "Connecting…"
                : "Connect & list"}
          </button>
        )}
        {activeMarket === "miniapps" && (
          <button
            className="btn primary"
            onClick={handleListClick}
            disabled={isConnecting}
          >
            {isConnected
              ? "List your App"
              : isConnecting
                ? "Connecting…"
                : "Connect & list"}
          </button>
        )}
        {activeMarket === "x" && (
          <button
            className="btn primary"
            onClick={handleListClick}
            disabled={isConnecting}
          >
            {isConnected
              ? "List your X Account"
              : isConnecting
                ? "Connecting…"
                : "Connect & list"}
          </button>
        )}
        {activeMarket === "farcaster" && (
          <button
            className="btn primary"
            onClick={handleListClick}
            disabled={isConnecting}
          >
            {isConnected
              ? "List your Identity"
              : isConnecting
                ? "Connecting…"
                : "Connect & list"}
          </button>
        )}
        {activeMarket === "clanker" && (
          <Link href="/clanker" className="btn primary">
            Open Clanker market
          </Link>
        )}
        {activeMarket === "bundles" && (
          <button
            className="btn primary"
            onClick={() => {
              if (!isConnected) {
                connect();
                return;
              }
              setShowBundleModal(true);
            }}
            disabled={isConnecting}
          >
            {isConnected
              ? "Create a bundle"
              : isConnecting
                ? "Connecting…"
                : "Connect & create"}
          </button>
        )}
      </div>

      <div className="market-tabs" role="tablist" aria-label="Marketplace tabs">
        {marketTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeMarket === tab.key}
            className={activeMarket === tab.key ? "active" : ""}
            onClick={() => setActiveMarket(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ALL MARKETS — one section per category */}
      {activeMarket === "all" && (
        <>
          <div className="market-section-head">
            <span className="market-section-icon">
              <NFTArt seed={2} />
            </span>
            <strong>NFT Loans</strong>
            <span className="market-section-count">{loans.length}</span>
            <button
              className="market-section-cta"
              onClick={() => setActiveMarket("nft")}
            >
              View all <Icon.arrow />
            </button>
          </div>
          {loading ? (
            <div className="muted" style={{ padding: 32, textAlign: "center" }}>
              Loading…
            </div>
          ) : (
            <div className="grid grid-4">
              {loans.slice(0, 4).map((l) => (
                <LoanCard key={l.id} l={l} />
              ))}
            </div>
          )}

          <div className="market-section-head">
            <span className="market-section-icon">
              <Icon.app />
            </span>
            <strong>Mini Apps</strong>
            <span className="market-section-count">{miniApps.length}</span>
            <button
              className="market-section-cta"
              onClick={() => setActiveMarket("miniapps")}
            >
              View all <Icon.arrow />
            </button>
          </div>
          <div className="market-listing-grid">
            {miniApps.slice(0, 4).map((app) => (
              <Link
                href={`/miniapps?id=${encodeURIComponent(app.id)}`}
                key={app.id}
                className="market-listing-card"
              >
                <span className="market-listing-icon">
                  <Icon.app />
                </span>
                <strong>{app.name}</strong>
                <small>
                  {app.kind} · {app.dau.toLocaleString()} DAU · {app.mrr} USDC MRR
                </small>
                <em>
                  {app.price} USDC <Icon.arrow />
                </em>
              </Link>
            ))}
          </div>

          <div className="market-section-head">
            <span className="market-section-icon">
              <Icon.xlogo />
            </span>
            <strong>X Accounts</strong>
            <span className="market-section-count">{xAccounts.length}</span>
            <button
              className="market-section-cta"
              onClick={() => setActiveMarket("x")}
            >
              View all <Icon.arrow />
            </button>
          </div>
          <div className="market-listing-grid">
            {xAccounts.slice(0, 4).map((account) => (
              <Link href={`/x?id=${encodeURIComponent(account.id)}`} key={account.id} className="market-listing-card">
                <span className="market-listing-icon">
                  <Icon.xlogo />
                </span>
                <strong>{account.handle}</strong>
                <small>
                  {account.followers.toLocaleString()} followers ·{" "}
                  {account.engagement}% engagement
                </small>
                <em>
                  {account.price} USDC <Icon.arrow />
                </em>
              </Link>
            ))}
          </div>

          <div className="market-section-head">
            <span className="market-section-icon">
              <Icon.cast />
            </span>
            <strong>Farcaster</strong>
            <span className="market-section-count">{farcaster.length}</span>
            <button
              className="market-section-cta"
              onClick={() => setActiveMarket("farcaster")}
            >
              View all <Icon.arrow />
            </button>
          </div>
          <div className="market-listing-grid">
            {farcaster.slice(0, 4).map((account) => (
              <Link
                href={`/farcaster?id=${encodeURIComponent(account.id)}`}
                key={account.id}
                className="market-listing-card"
              >
                <span className="market-listing-icon">
                  <Icon.cast />
                </span>
                <strong>@{account.handle}</strong>
                <small>
                  {account.followers.toLocaleString()} followers · FID #
                  {account.fid}
                </small>
                <em>
                  {account.price} USDC <Icon.arrow />
                </em>
              </Link>
            ))}
          </div>

          <div className="market-section-head">
            <span className="market-section-icon">
              <Icon.token />
            </span>
            <strong>Clanker Tokens</strong>
            <span className="market-section-count">{clankerTokens.length}</span>
            <button
              className="market-section-cta"
              onClick={() => setActiveMarket("clanker")}
            >
              View all <Icon.arrow />
            </button>
          </div>
          <div className="market-listing-grid">
            {clankerTokens.slice(0, 4).map((token) => (
              <Link
                href={`/clanker?id=${encodeURIComponent(token.id)}`}
                key={token.id}
                className="market-listing-card"
              >
                <span className="market-listing-icon">
                  <Icon.token />
                </span>
                <strong>
                  {token.name} (${token.symbol})
                </strong>
                <small>
                  {token.chain} · {token.totalSupply.toLocaleString()} supply
                </small>
                <em>
                  {token.price} USDC <Icon.arrow />
                </em>
              </Link>
            ))}
          </div>

          <div className="market-section-head">
            <span className="market-section-icon">
              <Icon.shield />
            </span>
            <strong>Bundled Listings</strong>
            <span className="market-section-count">{bundles.length}</span>
            <button
              className="market-section-cta"
              onClick={() => setActiveMarket("bundles")}
            >
              View all <Icon.arrow />
            </button>
          </div>
          <div className="bundle-all-grid">
            {bundles.length === 0 ? (
              <div
                className="muted"
                style={{
                  padding: 20,
                  textAlign: "center",
                  gridColumn: "1 / -1",
                }}
              >
                No bundled listings yet. Be the first to list multiple assets
                together.
              </div>
            ) : (
              bundles
                .slice(0, 3)
                .map((b) => <BundleCard key={b.id} bundle={b} />)
            )}
          </div>
        </>
      )}

      {/* NFT LOANS TAB — filter + full grid */}
      {activeMarket === "nft" && (
        <>
          <div
            id="nft-market"
            className="card"
            style={{ padding: 12, marginBottom: 18 }}
          >
            <div
              className="market-filter-bar row"
              style={{ gap: 16, flexWrap: "wrap" }}
            >
              <div className="chips">
                {chipData.map(([k, t, n]) => (
                  <button
                    key={k}
                    className={"chip" + (filter === k ? " active" : "")}
                    onClick={() => setFilter(k)}
                  >
                    {t} <span className="count">{n}</span>
                  </button>
                ))}
              </div>
              <div className="vsep" />
              <div className="row" style={{ gap: 8 }}>
                <span className="smallcaps">Collection</span>
                <Dropdown
                  value={collectionFilter}
                  options={["all", ...COLLECTIONS].map((c) => ({
                    value: c,
                    label: c === "all" ? "All collections" : c,
                  }))}
                  onChange={setCollectionFilter}
                  style={{ minWidth: 170 }}
                />
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span className="smallcaps">Amount</span>
                <input
                  className="input"
                  placeholder="0 — 100 USDC"
                  style={{ width: 130, height: 32 }}
                />
              </div>
              <div style={{ flex: 1 }} />
              <div className="row" style={{ gap: 6 }}>
                <button
                  className={"btn sm " + (showOnChain ? "primary" : "ghost")}
                  onClick={showOnChain ? fetchDbListings : fetchOnChain}
                  disabled={chainLoading}
                  style={{ fontSize: 11 }}
                >
                  {chainLoading ? "Reading chain…" : showOnChain ? "On-chain ✓" : "On-chain"}
                </button>
                <span className="smallcaps">Sort</span>
                <div className="seg">
                  {[
                    ["apr", "APR ↓"],
                    ["amt", "Amount"],
                    ["ltv", "LTV"],
                  ].map(([k, t]) => (
                    <button
                      key={k}
                      className={sort === k ? "active" : ""}
                      onClick={() => setSort(k)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="muted" style={{ padding: 80, textAlign: "center" }}>
              Loading listings…
            </div>
          ) : error ? (
            <div className="warn-banner" style={{ padding: 18 }}>
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="muted" style={{ padding: 80, textAlign: "center" }}>
              No loans match this filter.
            </div>
          ) : (
            <div className="grid grid-4">
              {filtered.map((l) => (
                <LoanCard key={l.id} l={l} />
              ))}
            </div>
          )}
        </>
      )}

      {/* MINI APPS TAB */}
      {activeMarket === "miniapps" && (
        <div className="market-listing-grid">
          {miniApps.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              No Mini App listings yet.
            </div>
          ) : (
            miniApps.map((app) => (
              <Link
                href={`/miniapps?id=${encodeURIComponent(app.id)}`}
                key={app.id}
                className="market-listing-card"
              >
                <span className="market-listing-icon">
                  <Icon.app />
                </span>
                <strong>{app.name}</strong>
                <small>
                  {app.kind} · {app.dau.toLocaleString()} DAU · {app.mrr} USDC MRR
                </small>
                <em>
                  {app.price} USDC <Icon.arrow />
                </em>
              </Link>
            ))
          )}
        </div>
      )}

      {/* X ACCOUNTS TAB */}
      {activeMarket === "x" && (
        <div className="market-listing-grid">
          {xAccounts.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              No X account listings yet.
            </div>
          ) : (
            xAccounts.map((account) => (
              <Link href={`/x?id=${encodeURIComponent(account.id)}`} key={account.id} className="market-listing-card">
                <span className="market-listing-icon">
                  <Icon.xlogo />
                </span>
                <strong>{account.handle}</strong>
                <small>
                  {account.followers.toLocaleString()} followers ·{" "}
                  {account.engagement}% engagement
                </small>
                <em>
                  {account.price} USDC <Icon.arrow />
                </em>
              </Link>
            ))
          )}
        </div>
      )}

      {/* FARCASTER TAB */}
      {activeMarket === "farcaster" && (
        <div className="market-listing-grid">
          {farcaster.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              No Farcaster listings yet.
            </div>
          ) : (
            farcaster.map((account) => (
              <Link
                href={`/farcaster?id=${encodeURIComponent(account.id)}`}
                key={account.id}
                className="market-listing-card"
              >
                <span className="market-listing-icon">
                  <Icon.cast />
                </span>
                <strong>@{account.handle}</strong>
                <small>
                  {account.followers.toLocaleString()} followers · FID #
                  {account.fid}
                </small>
                <em>
                  {account.price} USDC <Icon.arrow />
                </em>
              </Link>
            ))
          )}
        </div>
      )}

      {/* CLANKER TAB */}
      {activeMarket === "clanker" && (
        <div className="market-listing-grid">
          {clankerTokens.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              No Clanker token listings yet.
            </div>
          ) : (
            clankerTokens.map((token) => (
              <Link
                href={`/clanker?id=${encodeURIComponent(token.id)}`}
                key={token.id}
                className="market-listing-card"
              >
                <span className="market-listing-icon">
                  <Icon.token />
                </span>
                <strong>
                  {token.name} (${token.symbol})
                </strong>
                <small>
                  {token.chain} · {token.totalSupply.toLocaleString()} supply
                </small>
                <em>
                  {token.price} USDC <Icon.arrow />
                </em>
              </Link>
            ))
          )}
        </div>
      )}

      {/* BUNDLES TAB */}
      {activeMarket === "bundles" && (
        <div className="bundle-all-grid">
          {bundles.length === 0 ? (
            <div
              className="muted"
              style={{ padding: 40, textAlign: "center", gridColumn: "1 / -1" }}
            >
              No bundled listings yet.
            </div>
          ) : (
            bundles.map((b) => <BundleCard key={b.id} bundle={b} />)
          )}
        </div>
      )}

      {showListModal && activeMarket === "nft" && (
        <ListNFTModal onClose={() => setShowListModal(false)} />
      )}
      {showListModal && activeMarket === "miniapps" && (
        <ListMiniAppModal onClose={() => setShowListModal(false)} />
      )}
      {showListModal && activeMarket === "x" && (
        <ListXModal onClose={() => setShowListModal(false)} />
      )}
      {showListModal && activeMarket === "farcaster" && (
        <ListFidModal onClose={() => setShowListModal(false)} />
      )}
      {showBundleModal && (
        <ListBundleModal
          onClose={() => setShowBundleModal(false)}
          onListed={() => {
            fetch("/api/marketplace/bundles").then(async (r) => {
              const json = await r.json();
              if (json.data) setBundles(json.data);
            });
          }}
        />
      )}
    </main>
  );
}
