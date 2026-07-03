"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/icons";
import LoanCard from "@/components/LoanCard";
import Dropdown from "@/components/Dropdown";
import NFTArt from "@/components/NFTArt";
import { COLLECTIONS, bundleAssetLabel } from "@/lib/data";
import { nftImageUrl } from "@/lib/nft-images";
import { useWallet } from "@/components/WalletProvider";
import {
  ERC721_ABI,
  getDealsAddress,
  getEscrowAddress,
  getPublicClient,
  getNftAddress,
  sendContractCalls,
  VaultNFT_ABI,
  writeApproveUsdc,
  writeFundDeal,
  waitForListingId,
  parseContractError,
  readPlatformFeeBps,
} from "@/lib/contract";
import { isOwnListing as ownsListing } from "@/lib/identity";
import { logClientError } from "@/lib/client-log";
import { fmtFarcasterAccount, fmtUSDC } from "@/lib/utils";
import { parseUnits, type Address, type Hash } from "viem";
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
import ListClankerModal from "@/components/ListClankerModal";
import SubmitDealOfferModal from "@/components/SubmitDealOfferModal";
import ShareListingModal from "@/components/ShareListingModal";
import {
  ListingSuccessModal,
  type ListingSuccessShare,
} from "@/components/ListingSuccessModal";
import ListingFeedCard from "@/components/ListingFeedCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type ShareListingTarget = {
  id: string;
  title: string;
  text: string;
  url: string;
};

type LoanWithSeller = Loan & { sellerAddress?: string };
type MarketTab =
  | "all"
  | "nft"
  | "miniapps"
  | "x"
  | "farcaster"
  | "clanker"
  | "bundles";

const marketTabs: { key: MarketTab; label: string; description: string }[] = [
  {
    key: "all",
    label: "Feed",
    description: "Live drops across every vault market",
  },
  { key: "nft", label: "NFTs", description: "Collateralized NFT loans" },
  { key: "miniapps", label: "Apps", description: "Mini app acquisitions" },
  { key: "x", label: "X", description: "Audience accounts" },
  { key: "farcaster", label: "Farcaster", description: "FID transfers" },
  { key: "clanker", label: "Clanker", description: "Token inventories" },
  { key: "bundles", label: "Bundles", description: "Multi-asset deals" },
];

const marketTabTone: Record<MarketTab, string> = {
  all: "#0052ff",
  nft: "#7c3aed",
  miniapps: "#0ea5e9",
  x: "#111827",
  farcaster: "#855dcd",
  clanker: "#f59e0b",
  bundles: "#10b981",
};

function parseDisplayedTokenId(tokenId: string): bigint {
  const normalized = tokenId.trim().replace(/^#/, "");
  if (!normalized) throw new Error("Select a detected NFT before listing on-chain.");
  return BigInt(normalized);
}

async function listingIdFromReceipts(receipts: { hash: Hash }[]) {
  for (const receipt of [...receipts].reverse()) {
    try {
      const contractListingId = await waitForListingId(receipt.hash);
      return { contractListingId, txHash: receipt.hash };
    } catch {
      // Keep scanning older receipts; fallback mode returns approval then list txs.
    }
  }
  throw new Error("Listing transaction confirmed, but no Listed event was found.");
}

function MarketAssetCarousel({ children }: { children: React.ReactNode }) {
  const slides = React.Children.toArray(children);

  if (slides.length === 0) return null;

  return (
    <Carousel
      opts={{ align: "start", dragFree: true }}
      className="market-assets-carousel"
      aria-label="Market asset carousel"
    >
      <CarouselContent className="market-assets-carousel-content">
        {slides.map((child, index) => (
          <CarouselItem key={index} className="market-asset-carousel-item">
            {child}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="vault-carousel-prev" />
      <CarouselNext className="vault-carousel-next" />
    </Carousel>
  );
}

function DetectedNftThumb({
  imageUrl,
  seed,
  label,
}: {
  imageUrl: string;
  seed: number;
  label: string;
}) {
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={label}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      </>
    );
  }

  return <NFTArt seed={seed} />;
}

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
  const [success, setSuccess] = useState<ListingSuccessShare | null>(null);

  useEffect(() => {
    readPlatformFeeBps("nft")
      .then(setNftPlatformFeeBps)
      .catch(() => {});
  }, []);

  const [tooltip, setTooltip] = useState("");

  // Auto-detect NFTs when modal opens
  useEffect(() => {
    if (!address) return;
    queueMicrotask(() => setScanning(true));
    fetch(`/api/nfts/${address}?chain=base`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch NFTs (${res.status})`);
        const json = await res.json();
        if (json.error) {
          logClientError("nft_scan_failed", json.error, {
            address,
            chain: "base",
            code: json.code,
          });
          setError("Could not fetch NFTs. Make sure your wallet is on Base.");
        } else {
          setError("");
        }
        const nfts = (json.data || []) as {
          contract: { address: string; name?: string };
          tokenId: string;
          name?: string;
          floorPriceEth?: number;
          collection?: { name?: string };
          image?: {
            cachedUrl?: string;
            thumbnailUrl?: string;
            pngUrl?: string;
            originalUrl?: string;
          };
          raw?: {
            metadata?: {
              image?: string;
              image_url?: string;
              imageUrl?: string;
              animation_url?: string;
            };
          };
          media?: Array<{ gateway?: string; thumbnail?: string; raw?: string }>;
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
            imageUrl: nftImageUrl(n),
          }));
        setDetectedNfts(found);
        setScanning(false);
      })
      .catch((err) => {
        logClientError("nft_scan_failed", err, { address, chain: "base" });
        setError("Could not fetch NFTs. Make sure your wallet is on Base.");
        setScanning(false);
      });
  }, [address]);

  const refetchNfts = async () => {
    if (!address) return;
    setScanning(true);
    try {
      const res = await fetch(`/api/nfts/${address}?chain=base`);
      if (!res.ok) throw new Error(`Failed to fetch NFTs (${res.status})`);
      const json = await res.json();
      if (json.error) {
        logClientError("nft_scan_failed", json.error, {
          address,
          chain: "base",
          code: json.code,
        });
        setError("Could not fetch NFTs. Make sure your wallet is on Base.");
      } else {
        setError("");
      }
      const nfts = (json.data || []) as {
        contract: { address: string; name?: string };
        tokenId: string;
        name?: string;
        floorPriceEth?: number;
        collection?: { name?: string };
        image?: {
          cachedUrl?: string;
          thumbnailUrl?: string;
          pngUrl?: string;
          originalUrl?: string;
        };
        raw?: {
          metadata?: {
            image?: string;
            image_url?: string;
            imageUrl?: string;
            animation_url?: string;
          };
        };
        media?: Array<{ gateway?: string; thumbnail?: string; raw?: string }>;
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
          imageUrl: nftImageUrl(n),
        }));
      setDetectedNfts(found);
    } catch (err) {
      logClientError("nft_scan_failed", err, { address, chain: "base" });
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
  const impliedLtv = 0;
  const platformFee = (Number(amount || 0) * nftPlatformFeeBps) / 10000;

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

      // 1. Approve NFT and list on-chain. Uses wallet_sendCalls when supported,
      // with an ordered two-transaction fallback for wallets without EIP-5792.
      const nftTokenId = parseDisplayedTokenId(tokenId);
      const amountWei = parseUnits(amount || "0", 6);
      const aprBps = Math.round(Number(apr) * 100); // e.g. 14.2 → 1420
      const termDays = Number(term);

      if (!selectedContract)
        throw new Error("Select a detected NFT before listing on-chain.");
      const escrowAddr = await getNftAddress();

      const callsResult = await sendContractCalls(
        address as `0x${string}`,
        [
          {
            address: selectedContract as `0x${string}`,
            abi: ERC721_ABI,
            functionName: "approve",
            args: [escrowAddr, nftTokenId],
          },
          {
            address: escrowAddr,
            abi: VaultNFT_ABI,
            functionName: "listNFT",
            args: [
              selectedContract as `0x${string}`,
              nftTokenId,
              amountWei,
              BigInt(aprBps),
              BigInt(termDays),
            ],
          },
        ],
        { forceAtomic: true, waitForReceipts: true },
      );
      if (callsResult.status === "failure") {
        throw new Error("NFT listing transaction failed.");
      }
      const { contractListingId, txHash: listTxHash } = await listingIdFromReceipts(
        callsResult.receipts,
      );

      // 2. POST to API
      const listingId = `L-${Date.now()}`;
      const res = await fetch("/api/listings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: listingId,
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
      setSuccess({
        title: `${collection} ${tokenId}`,
        text: `${collection} ${tokenId} — borrow ${Number(amount).toLocaleString("en-US")} USDC at ${apr}% APR on Vault`,
        url: `${window.location.origin}/detail?id=${encodeURIComponent(listingId)}`,
      });
    } catch (err) {
      logClientError("market:list-nft:failed", err, {
        collection,
        tokenId,
        selectedContract,
      });
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return <ListingSuccessModal share={success} onClose={onClose} />;
  }

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
                        <DetectedNftThumb
                          imageUrl={n.imageUrl}
                          seed={n.seed}
                          label={`${n.collection} ${n.tokenId}`}
                        />
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
              </div>

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
                  <span className="k">
                    Platform fee ({nftPlatformFeeBps / 100}%)
                  </span>
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

function BundleDetailPanel({
  bundle,
  buying,
  buyerAddress,
  sessionAddress,
  onBuy,
  onOffer,
}: {
  bundle: BundleListing;
  buying: boolean;
  buyerAddress?: string | null;
  sessionAddress?: string | null;
  onBuy: (bundle: BundleListing) => void;
  onOffer: (bundle: BundleListing) => void;
}) {
  const seller = bundle.sellerAddress
    ? `${bundle.sellerAddress.slice(0, 6)}...${bundle.sellerAddress.slice(-4)}`
    : "Unknown";
  const isOwnListing = ownsListing(bundle, {
    address: buyerAddress,
    sessionAddress,
  });
  const isPendingSync = !bundle.contractListingId;

  return (
    <section className="bundle-detail-panel">
      <div className="bundle-detail-media">
        {bundle.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bundle.imageUrl} alt={bundle.name} />
        ) : (
          <span>
            <Icon.shield />
          </span>
        )}
      </div>
      <div className="bundle-detail-body">
        <div
          className="row between"
          style={{ gap: 12, alignItems: "flex-start" }}
        >
          <div>
            <div className="eyebrow">Bundle listing</div>
            <h2 className="serif" style={{ fontSize: 28, margin: "6px 0 4px" }}>
              {bundle.name}
            </h2>
            {bundle.description && (
              <p className="muted" style={{ margin: 0, maxWidth: 620 }}>
                {bundle.description}
              </p>
            )}
          </div>
          <Link
            href="/market?tab=bundles"
            className="btn ghost sm"
            aria-label="Close bundle details"
          >
            <Icon.x />
          </Link>
        </div>

        <div className="grid grid-3" style={{ marginTop: 18 }}>
          <div className="metric">
            <span className="lab">Bundle price</span>
            <span className="val">
              {fmtUSDC(bundle.totalPrice)} {bundle.currency || "USDC"}
            </span>
          </div>
          <div className="metric">
            <span className="lab">Assets</span>
            <span className="val">{bundle.assets.length}</span>
          </div>
          <div className="metric">
            <span className="lab">Seller</span>
            <span className="val" style={{ fontSize: 14 }}>
              {seller}
            </span>
          </div>
        </div>

        <div className="bundle-detail-assets">
          {bundle.assets.map((asset) => (
            <div key={asset.id} className="bundle-detail-asset">
              <span className="bundle-asset-icon">
                <Icon.asset />
              </span>
              <div>
                <strong>{asset.label}</strong>
                <small>
                  {bundleAssetLabel(asset.kind)}
                  {asset.detail ? ` · ${asset.detail}` : ""}
                </small>
              </div>
              {asset.price > 0 && (
                <em>
                  {fmtUSDC(asset.price)} {bundle.currency || "USDC"}
                </em>
              )}
            </div>
          ))}
        </div>
        <div
          className="row"
          style={{ gap: 10, justifyContent: "flex-end", marginTop: 18 }}
        >
          <Link href="/market?tab=bundles" className="btn">
            Back to bundles
          </Link>
          <button
            className="btn"
            onClick={() => onOffer(bundle)}
            disabled={isOwnListing || isPendingSync}
          >
            Submit offer
          </button>
          <button
            className="btn primary"
            onClick={() => onBuy(bundle)}
            disabled={buying || isOwnListing || isPendingSync}
          >
            {buying
              ? "Funding escrow..."
              : isOwnListing
                ? "Your listing"
                : isPendingSync
                  ? "Pending chain sync"
                  : "Buy with escrow"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function MarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedBundleId = searchParams.get("id");
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
  const [showClankerModal, setShowClankerModal] = useState(false);
  const [offerBundle, setOfferBundle] = useState<BundleListing | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareListingTarget | null>(
    null,
  );
  const [buyingBundleId, setBuyingBundleId] = useState("");
  const [chainLoading, setChainLoading] = useState(false);
  const [showOnChain, setShowOnChain] = useState(false);
  const { isConnected, connect, isConnecting, address, sessionAddress } =
    useWallet();
  const walletIdentity = useMemo(
    () => ({ address, sessionAddress }),
    [address, sessionAddress],
  );

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
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        setLoans(json.data || []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  };

  const filtered = useMemo(() => {
    let r = loans.filter((l) => {
      if (filter === "all") return true;
      if (filter === "my")
        return ownsListing(l as LoanWithSeller, walletIdentity);
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
  }, [filter, sort, loans, collectionFilter, walletIdentity]);

  const selectedBundle = useMemo(
    () => bundles.find((bundle) => bundle.id === selectedBundleId) || null,
    [bundles, selectedBundleId],
  );

  const chipData: [string, string, number][] = [
    ["all", "All", loans.length],
    [
      "my",
      "My Listings",
      loans.filter((l) => ownsListing(l as LoanWithSeller, walletIdentity))
        .length,
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

  const openShareModal = (target: ShareListingTarget) => {
    setShareTarget(target);
  };

  const shareLoanTarget = (loan: Loan): ShareListingTarget => ({
    id: loan.id,
    title: `${COLLECTIONS[loan.coll]} ${loan.token}`,
    text: `${COLLECTIONS[loan.coll]} ${loan.token} — borrow ${fmtUSDC(loan.amt)} USDC at ${loan.apr}% APR on Vault`,
    url: `${window.location.origin}/detail?id=${encodeURIComponent(loan.id)}`,
  });

  const shareMiniAppTarget = (app: MiniApp): ShareListingTarget => ({
    id: app.id,
    title: app.name,
    text: `${app.name} — ${fmtUSDC(app.price)} USDC Mini App listing on Vault`,
    url: `${window.location.origin}/miniapps?id=${encodeURIComponent(app.id)}`,
  });

  const shareXTarget = (account: XAccount): ShareListingTarget => ({
    id: account.id,
    title: account.handle,
    text: `${account.handle} — ${fmtUSDC(account.price)} USDC X account listing on Vault`,
    url: `${window.location.origin}/x?id=${encodeURIComponent(account.id)}`,
  });

  const shareFarcasterTarget = (
    account: FarcasterAccount,
  ): ShareListingTarget => ({
    id: account.id,
    title: fmtFarcasterAccount(account),
    text: `${fmtFarcasterAccount(account)} — ${fmtUSDC(account.price)} USDC Farcaster listing on Vault`,
    url: `${window.location.origin}/farcaster?id=${encodeURIComponent(account.id)}`,
  });

  const shareClankerTarget = (token: ClankerToken): ShareListingTarget => ({
    id: token.id,
    title: `${token.name} (${token.symbol})`,
    text: `${token.name} (${token.symbol}) — ${fmtUSDC(token.price)} USDC Clanker token listing on Vault`,
    url: `${window.location.origin}/clanker?id=${encodeURIComponent(token.id)}`,
  });

  const shareBundleTarget = (bundle: BundleListing): ShareListingTarget => ({
    id: bundle.id,
    title: bundle.name,
    text: `${bundle.name} — ${fmtUSDC(bundle.totalPrice)} ${bundle.currency || "USDC"} bundled listing on Vault`,
    url: `${window.location.origin}/market?tab=bundles&id=${encodeURIComponent(bundle.id)}`,
  });

  const fundBundleEscrow = async (bundle: BundleListing) => {
    if (!isConnected || !address) {
      connect();
      return;
    }
    setBuyingBundleId(bundle.id);
    setError("");
    try {
      if (!bundle.sellerAddress) throw new Error("Listing seller is missing.");
      if (ownsListing(bundle, walletIdentity)) {
        throw new Error("You cannot buy your own listing.");
      }
      if (!bundle.contractListingId) {
        throw new Error(
          "Listing is pending chain sync. Try again after the listing transaction is confirmed.",
        );
      }

      const amountWei = parseUnits(String(bundle.totalPrice), 6);
      const approveHash = await writeApproveUsdc(
        address as Address,
        await getDealsAddress(),
        amountWei,
      );
      await getPublicClient().waitForTransactionReceipt({ hash: approveHash });
      const txHash = await writeFundDeal(
        address as Address,
        BigInt(bundle.contractListingId),
        amountWei,
      );

      const res = await fetch("/api/escrows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: bundle.id,
          buyerAddress: address,
          sellerAddress: bundle.sellerAddress,
          amount: bundle.totalPrice,
          currency: bundle.currency || "USDC",
          chainId: bundle.chainId || 8453,
          contractAddress: bundle.contractAddress || getEscrowAddress(),
          contractListingId: bundle.contractListingId,
          txHash,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to create escrow");
      router.push(
        `/deals?id=${encodeURIComponent(json.data?.id || bundle.id)}`,
      );
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setBuyingBundleId("");
    }
  };

  const tabCounts: Record<MarketTab, number> = {
    all:
      loans.length +
      miniApps.length +
      xAccounts.length +
      farcaster.length +
      clankerTokens.length +
      bundles.length,
    nft: loans.length,
    miniapps: miniApps.length,
    x: xAccounts.length,
    farcaster: farcaster.length,
    clanker: clankerTokens.length,
    bundles: bundles.length,
  };
  return (
    <main
      id="main-content"
      role="main"
      aria-label="Main content"
      className="main market-discovery"
    >
      <div
        className="market-discovery-toolbar"
        style={
          {
            "--market-active": marketTabTone[activeMarket],
          } as React.CSSProperties
        }
      >
        <div
          className="market-tabs market-discovery-tabs"
          role="tablist"
          aria-label="Marketplace tabs"
        >
          {marketTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeMarket === tab.key}
              className={activeMarket === tab.key ? "active" : ""}
              style={
                {
                  "--market-tab": marketTabTone[tab.key],
                } as React.CSSProperties
              }
              onClick={() => setActiveMarket(tab.key)}
            >
              <span>{tab.label}</span>
              <small>{tabCounts[tab.key]}</small>
            </button>
          ))}
        </div>
        {activeMarket === "all" && (
          <button
            className="btn primary market-discovery-action"
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
            className="btn primary market-discovery-action"
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
            className="btn primary market-discovery-action"
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
            className="btn primary market-discovery-action"
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
            className="btn primary market-discovery-action"
            onClick={handleListClick}
            disabled={isConnecting}
          >
            {isConnected
              ? "List Farcaster account"
              : isConnecting
                ? "Connecting…"
                : "Connect & list"}
          </button>
        )}
        {activeMarket === "clanker" && (
          <button
            className="btn primary market-discovery-action"
            onClick={() => {
              if (!isConnected) {
                connect();
                return;
              }
              setShowClankerModal(true);
            }}
            disabled={isConnecting}
          >
            {isConnected
              ? "List Clanker token"
              : isConnecting
                ? "Connecting…"
                : "Connect & list"}
          </button>
        )}
        {activeMarket === "bundles" && (
          <button
            className="btn primary market-discovery-action"
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

      {/* ALL MARKETS — only show sections with listings */}
      {activeMarket === "all" && (
        <>
          {loans.length > 0 && (
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
                <div
                  className="muted"
                  style={{ padding: 32, textAlign: "center" }}
                >
                  Loading…
                </div>
              ) : (
                <MarketAssetCarousel>
                  {loans.slice(0, 4).map((l) => (
                    <LoanCard
                      key={l.id}
                      l={l}
                      onShare={(loan) => openShareModal(shareLoanTarget(loan))}
                    />
                  ))}
                </MarketAssetCarousel>
              )}
            </>
          )}

          {miniApps.length > 0 && (
            <>
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
              <MarketAssetCarousel>
                {miniApps.slice(0, 4).map((app) => (
                  <ListingFeedCard
                    key={app.id}
                    href={`/miniapps?id=${encodeURIComponent(app.id)}`}
                    icon={<Icon.app />}
                    imageUrl={app.imageUrl}
                    imageAlt={`${app.name} preview`}
                    title={app.name}
                    subtitle={app.kind}
                    description={app.description}
                    stats={[
                      { label: "DAU", value: app.dau.toLocaleString() },
                      { label: "MRR", value: `${fmtUSDC(app.mrr)} USDC` },
                    ]}
                    price={fmtUSDC(app.price)}
                    actions={
                      <>
                        <Link
                          href={`/miniapps?id=${encodeURIComponent(app.id)}`}
                          className="btn primary sm"
                        >
                          <Icon.arrow /> View app
                        </Link>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() =>
                            openShareModal(shareMiniAppTarget(app))
                          }
                        >
                          <Icon.share /> Share
                        </button>
                      </>
                    }
                  />
                ))}
              </MarketAssetCarousel>
            </>
          )}

          {xAccounts.length > 0 && (
            <>
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
              <MarketAssetCarousel>
                {xAccounts.slice(0, 4).map((account) => (
                  <ListingFeedCard
                    key={account.id}
                    href={`/x?id=${encodeURIComponent(account.id)}`}
                    icon={<Icon.xlogo />}
                    imageUrl={account.imageUrl}
                    imageAlt={`${account.handle} preview`}
                    title={account.handle}
                    subtitle={account.niche || "X handle"}
                    stats={[
                      {
                        label: "Followers",
                        value: account.followers.toLocaleString(),
                      },
                      { label: "Engage", value: `${account.engagement}%` },
                      { label: "30d growth", value: account.growth },
                    ]}
                    price={fmtUSDC(account.price)}
                    actions={
                      <>
                        <Link
                          href={`/x?id=${encodeURIComponent(account.id)}`}
                          className="btn primary sm"
                        >
                          <Icon.arrow /> View account
                        </Link>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => openShareModal(shareXTarget(account))}
                        >
                          <Icon.share /> Share
                        </button>
                      </>
                    }
                  />
                ))}
              </MarketAssetCarousel>
            </>
          )}

          {farcaster.length > 0 && (
            <>
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
              <MarketAssetCarousel>
                {farcaster.slice(0, 4).map((account) => (
                  <ListingFeedCard
                    key={account.id}
                    href={`/farcaster?id=${encodeURIComponent(account.id)}`}
                    icon={<Icon.cast />}
                    imageUrl={account.imageUrl}
                    imageAlt={`${fmtFarcasterAccount(account)} preview`}
                    title={fmtFarcasterAccount(account)}
                    subtitle={`FID #${account.fid}${account.channel ? ` · /${account.channel}` : ""}`}
                    stats={[
                      {
                        label: "Followers",
                        value: account.followers.toLocaleString(),
                      },
                      { label: "Casts / 30d", value: account.casts_30d },
                      {
                        label: "Revenue",
                        value:
                          account.rev_30d > 0 ? fmtUSDC(account.rev_30d) : "0",
                      },
                    ]}
                    price={fmtUSDC(account.price)}
                    badge={account.power_badge ? "Power" : undefined}
                    actions={
                      <>
                        <Link
                          href={`/farcaster?id=${encodeURIComponent(account.id)}`}
                          className="btn primary sm"
                        >
                          <Icon.arrow /> View FID
                        </Link>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() =>
                            openShareModal(shareFarcasterTarget(account))
                          }
                        >
                          <Icon.share /> Share
                        </button>
                      </>
                    }
                  />
                ))}
              </MarketAssetCarousel>
            </>
          )}

          {clankerTokens.length > 0 && (
            <>
              <div className="market-section-head">
                <span className="market-section-icon">
                  <Icon.token />
                </span>
                <strong>Clanker Tokens</strong>
                <span className="market-section-count">
                  {clankerTokens.length}
                </span>
                <button
                  className="market-section-cta"
                  onClick={() => setActiveMarket("clanker")}
                >
                  View all <Icon.arrow />
                </button>
              </div>
              <MarketAssetCarousel>
                {clankerTokens.slice(0, 4).map((token) => (
                  <ListingFeedCard
                    key={token.id}
                    href={`/clanker?id=${encodeURIComponent(token.id)}`}
                    icon={<Icon.token />}
                    imageUrl={token.imageUrl}
                    imageAlt={`${token.name} token preview`}
                    title={`${token.name} (${token.symbol})`}
                    subtitle={token.chain}
                    stats={[
                      {
                        label: "Supply",
                        value: token.totalSupply.toLocaleString(),
                      },
                      {
                        label: "Remaining",
                        value: token.remainingSupply.toLocaleString(),
                      },
                      {
                        label: "Fees",
                        value: token.feeEarnings.toLocaleString(),
                      },
                    ]}
                    price={fmtUSDC(token.price)}
                    badge={token.verified ? "Verified" : undefined}
                    actions={
                      <>
                        <Link
                          href={`/clanker?id=${encodeURIComponent(token.id)}`}
                          className="btn primary sm"
                        >
                          <Icon.arrow /> View token
                        </Link>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() =>
                            openShareModal(shareClankerTarget(token))
                          }
                        >
                          <Icon.share /> Share
                        </button>
                      </>
                    }
                  />
                ))}
              </MarketAssetCarousel>
            </>
          )}

          {bundles.length > 0 && (
            <>
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
              <MarketAssetCarousel>
                {bundles.slice(0, 3).map((b) => (
                  <BundleCard
                    key={b.id}
                    bundle={b}
                    onShare={(bundle) =>
                      openShareModal(shareBundleTarget(bundle))
                    }
                  />
                ))}
              </MarketAssetCarousel>
            </>
          )}

          {!loading &&
            loans.length === 0 &&
            miniApps.length === 0 &&
            xAccounts.length === 0 &&
            farcaster.length === 0 &&
            clankerTokens.length === 0 &&
            bundles.length === 0 && (
              <div
                className="muted"
                style={{ padding: 80, textAlign: "center" }}
              >
                No listings yet. Be the first to list an asset.
              </div>
            )}
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
                  {chainLoading
                    ? "Reading chain…"
                    : showOnChain
                      ? "On-chain ✓"
                      : "On-chain"}
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
            <MarketAssetCarousel>
              {filtered.map((l) => (
                <LoanCard
                  key={l.id}
                  l={l}
                  onShare={(loan) => openShareModal(shareLoanTarget(loan))}
                />
              ))}
            </MarketAssetCarousel>
          )}
        </>
      )}

      {/* MINI APPS TAB */}
      {activeMarket === "miniapps" && (
        <>
          {miniApps.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              No Mini App listings yet.
            </div>
          ) : (
            <MarketAssetCarousel>
              {miniApps.map((app) => (
                <ListingFeedCard
                  key={app.id}
                  href={`/miniapps?id=${encodeURIComponent(app.id)}`}
                  icon={<Icon.app />}
                  imageUrl={app.imageUrl}
                  imageAlt={`${app.name} preview`}
                  title={app.name}
                  subtitle={app.kind}
                  description={app.description}
                  stats={[
                    { label: "DAU", value: app.dau.toLocaleString() },
                    { label: "MRR", value: `${fmtUSDC(app.mrr)} USDC` },
                  ]}
                  price={fmtUSDC(app.price)}
                  actions={
                    <>
                      <Link
                        href={`/miniapps?id=${encodeURIComponent(app.id)}`}
                        className="btn primary sm"
                      >
                        <Icon.arrow /> View app
                      </Link>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => openShareModal(shareMiniAppTarget(app))}
                      >
                        <Icon.share /> Share
                      </button>
                    </>
                  }
                />
              ))}
            </MarketAssetCarousel>
          )}
        </>
      )}

      {/* X ACCOUNTS TAB */}
      {activeMarket === "x" && (
        <>
          {xAccounts.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              No X account listings yet.
            </div>
          ) : (
            <MarketAssetCarousel>
              {xAccounts.map((account) => (
                <ListingFeedCard
                  key={account.id}
                  href={`/x?id=${encodeURIComponent(account.id)}`}
                  icon={<Icon.xlogo />}
                  imageUrl={account.imageUrl}
                  imageAlt={`${account.handle} preview`}
                  title={account.handle}
                  subtitle={account.niche || "X handle"}
                  stats={[
                    {
                      label: "Followers",
                      value: account.followers.toLocaleString(),
                    },
                    { label: "Engage", value: `${account.engagement}%` },
                    { label: "30d growth", value: account.growth },
                  ]}
                  price={fmtUSDC(account.price)}
                  actions={
                    <>
                      <Link
                        href={`/x?id=${encodeURIComponent(account.id)}`}
                        className="btn primary sm"
                      >
                        <Icon.arrow /> View account
                      </Link>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => openShareModal(shareXTarget(account))}
                      >
                        <Icon.share /> Share
                      </button>
                    </>
                  }
                />
              ))}
            </MarketAssetCarousel>
          )}
        </>
      )}

      {/* FARCASTER TAB */}
      {activeMarket === "farcaster" && (
        <>
          {farcaster.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              No Farcaster listings yet.
            </div>
          ) : (
            <MarketAssetCarousel>
              {farcaster.map((account) => (
                <ListingFeedCard
                  key={account.id}
                  href={`/farcaster?id=${encodeURIComponent(account.id)}`}
                  icon={<Icon.cast />}
                  imageUrl={account.imageUrl}
                  imageAlt={`${fmtFarcasterAccount(account)} preview`}
                  title={fmtFarcasterAccount(account)}
                  subtitle={`FID #${account.fid}${account.channel ? ` · /${account.channel}` : ""}`}
                  stats={[
                    {
                      label: "Followers",
                      value: account.followers.toLocaleString(),
                    },
                    { label: "Casts / 30d", value: account.casts_30d },
                    {
                      label: "Revenue",
                      value:
                        account.rev_30d > 0 ? fmtUSDC(account.rev_30d) : "0",
                    },
                  ]}
                  price={fmtUSDC(account.price)}
                  badge={account.power_badge ? "Power" : undefined}
                  actions={
                    <>
                      <Link
                        href={`/farcaster?id=${encodeURIComponent(account.id)}`}
                        className="btn primary sm"
                      >
                        <Icon.arrow /> View FID
                      </Link>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() =>
                          openShareModal(shareFarcasterTarget(account))
                        }
                      >
                        <Icon.share /> Share
                      </button>
                    </>
                  }
                />
              ))}
            </MarketAssetCarousel>
          )}
        </>
      )}

      {/* CLANKER TAB */}
      {activeMarket === "clanker" && (
        <>
          {clankerTokens.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              No Clanker token listings yet.
            </div>
          ) : (
            <MarketAssetCarousel>
              {clankerTokens.map((token) => (
                <ListingFeedCard
                  key={token.id}
                  href={`/clanker?id=${encodeURIComponent(token.id)}`}
                  icon={<Icon.token />}
                  imageUrl={token.imageUrl}
                  imageAlt={`${token.name} token preview`}
                  title={`${token.name} (${token.symbol})`}
                  subtitle={token.chain}
                  stats={[
                    {
                      label: "Supply",
                      value: token.totalSupply.toLocaleString(),
                    },
                    {
                      label: "Remaining",
                      value: token.remainingSupply.toLocaleString(),
                    },
                    {
                      label: "Fees",
                      value: token.feeEarnings.toLocaleString(),
                    },
                  ]}
                  price={fmtUSDC(token.price)}
                  badge={token.verified ? "Verified" : undefined}
                  actions={
                    <>
                      <Link
                        href={`/clanker?id=${encodeURIComponent(token.id)}`}
                        className="btn primary sm"
                      >
                        <Icon.arrow /> View token
                      </Link>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() =>
                          openShareModal(shareClankerTarget(token))
                        }
                      >
                        <Icon.share /> Share
                      </button>
                    </>
                  }
                />
              ))}
            </MarketAssetCarousel>
          )}
        </>
      )}

      {/* BUNDLES TAB */}
      {activeMarket === "bundles" && (
        <>
          {selectedBundle && (
            <BundleDetailPanel
              bundle={selectedBundle}
              buying={buyingBundleId === selectedBundle.id}
              buyerAddress={address}
              sessionAddress={sessionAddress}
              onBuy={fundBundleEscrow}
              onOffer={setOfferBundle}
            />
          )}
          {bundles.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>
              No bundled listings yet.
            </div>
          ) : (
            <MarketAssetCarousel>
              {bundles.map((b) => (
                <BundleCard
                  key={b.id}
                  bundle={b}
                  onShare={(bundle) =>
                    openShareModal(shareBundleTarget(bundle))
                  }
                />
              ))}
            </MarketAssetCarousel>
          )}
        </>
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
      {showClankerModal && (
        <ListClankerModal
          onClose={() => setShowClankerModal(false)}
          onListed={() => {
            fetch("/api/marketplace/clanker").then(async (r) => {
              const json = await r.json();
              if (json.data) setClankerTokens(json.data);
            });
          }}
        />
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
      {offerBundle && (
        <SubmitDealOfferModal
          listing={{
            id: offerBundle.id,
            title: offerBundle.name,
            price: offerBundle.totalPrice,
            sellerAddress: offerBundle.sellerAddress,
            contractListingId: offerBundle.contractListingId,
            contractAddress: offerBundle.contractAddress,
            chainId: offerBundle.chainId,
          }}
          onClose={() => setOfferBundle(null)}
        />
      )}
      {shareTarget && (
        <ShareListingModal
          title={shareTarget.title}
          text={shareTarget.text}
          url={shareTarget.url}
          onClose={() => setShareTarget(null)}
        />
      )}
    </main>
  );
}
