"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/icons";
import ListingMessageModal from "@/components/ListingMessageModal";
import ShareListingModal from "@/components/ShareListingModal";
import ListingFeedCard from "@/components/ListingFeedCard";
import StatusPill from "@/components/StatusPill";
import { useRole } from "@/components/RoleProvider";
import { useWallet } from "@/components/WalletProvider";
import {
  getPublicClient,
  parseContractError,
  writeConfirmDelivery,
  writeDisputeDeal,
  writeMarkDelivered,
  writeRefundDeal,
  writeAcceptSignedDealOffer,
  writeAcceptSignedLoanOffer,
  writeCancelDeal,
  writeCancelListing,
  writeCancelMiniApp,
  writeCancelDealOfferNonce,
  writeCancelNftOfferNonce,
  readPlatformFeeBps,
} from "@/lib/contract";
import {
  claimClankerVaultedTokens,
  transferClankerRewardAdmins,
  transferClankerRewardRecipients,
  transferClankerTokenAdmin,
  transferClankerTokenSupply,
} from "@/lib/clanker-writes";
import { fmtUSDC } from "@/lib/utils";
import type { SignedDealOfferMessage, SignedLoanOfferMessage } from "@/lib/signed-offers";
import { selectedRights } from "@/lib/clanker";
import { currentActorAddress } from "@/lib/identity";
import type { BundleListing, ClankerToken, FarcasterAccount, Loan, MiniApp, XAccount } from "@/lib/data";
import { type Address, type Hash } from "viem";
import { shareAsCast } from "@/lib/farcaster-sdk";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EscrowItem {
  id: string;
  kind: string;
  party: string;
  asset: string;
  amount: number;
  asset_type: string;
  deadline: string;
  stage: string;
  action: string;
}

interface DealDetail {
  id: string;
  kind: string;
  name: string;
  type: string;
  asset: string;
  amount: number;
  price: number;
  mrr: number;
  currency: string;
  chain: string;
  includes: string[];
  isBundle: boolean;
  bundleAssets: { id: string; kind: string; label: string; detail: string; position: number }[];
  party: string;
  buyerAddress: string;
  sellerAddress: string;
  deadline: string;
  stage: string;
  stageRaw: string;
  action: string;
  listingId: string;
  chainId?: number;
  contractAddress?: string;
  contractListingId?: string;
  txStatus?: string;
  clankerTransfer?: {
    tokenAddress: string;
    saleRights: string[];
    remainingSupply: number;
    vaultedAmount: number;
    vaultUnlock: string;
    feeEarnings: number;
    symbol: string;
  } | null;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderAddress?: string;
  body: string;
  createdAt: string;
  me: boolean;
  readAt?: string | null;
  messageType?: string;
  imageUrl?: string | null;
}

interface ProfileListing {
  id: string;
  kind: string;
  shareKind: "nft" | "miniapps" | "x" | "farcaster" | "clanker" | "bundles";
  title: string;
  price: number;
  currency: string;
  status: string;
  href: string;
  sellerAddress?: string;
  contractListingId?: string;
  cancelPath: string;
  cancelMethod: "PATCH" | "DELETE";
  offers: ProfileOffer[];
}

interface ListingInboxThread {
  listingId: string;
  listingTitle: string;
  marketplace: string;
  buyerAddress: string;
  sellerAddress: string;
  counterpartyAddress: string;
  counterpartyName: string;
  lastSenderName: string;
  preview: string;
  createdAt: string;
  unreadCount: number;
  role: "buyer" | "seller";
}

interface ProfileOffer {
  id: string;
  listingId: string;
  offererAddress: string;
  amt: number;
  apr: number;
  term: number;
  status: string;
  expiresAt?: string | null;
  signature?: `0x${string}`;
  nonce?: string;
  typedData?: unknown;
  marketplace?: string;
  contractListingId?: string;
}

type ProfileOfferAcceptPayload = ProfileOffer & {
  signature: `0x${string}`;
  nonce: string;
  typedData: unknown;
};

type ProfileLoan = Loan & {
  collection?: string;
  sellerAddress?: string;
};

/* ------------------------------------------------------------------ */
/*  View / filter helpers                                              */
/* ------------------------------------------------------------------ */

type View = "active" | "action" | "history" | "all";

const VIEWS: { key: View; label: string }[] = [
  { key: "active",  label: "Active" },
  { key: "action",  label: "Needs Action" },
  { key: "history", label: "History" },
  { key: "all",     label: "All" },
];

const STAGES = [
  "Awaiting deposit", "Funds locked", "Transfer",
  "Awaiting confirmation", "Released", "Disputed", "Refunded",
];

function filterByView(escrows: EscrowItem[], view: View): EscrowItem[] {
  if (view === "active")  return escrows.filter(e => e.stage !== "Released" && e.stage !== "Refunded");
  if (view === "action")  return escrows.filter(e => e.stage === "Disputed" || e.stage === "Awaiting confirmation");
  if (view === "history") return escrows.filter(e => e.stage === "Released" || e.stage === "Refunded");
  return escrows;
}

/* ------------------------------------------------------------------ */
/*  Deal Room (detail view)                                            */
/* ------------------------------------------------------------------ */

const DEAL_STEPS = [
  "Buyer deposits", "Seller transfers", "Buyer confirms", "Funds release", "Fee deducted",
];

function stageToStep(stageRaw: string) {
  if (stageRaw === "awaiting_deposit") return 0;
  if (stageRaw === "funds_locked") return 1;
  if (stageRaw === "asset_transferred") return 2;
  if (stageRaw === "awaiting_confirmation") return 3;
  if (stageRaw === "released") return 4;
  return 2;
}

function clankerRightLabels(rights: string[]) {
  const expanded = selectedRights(rights);
  return [
    expanded.feeRights ? "Creator fee recipients" : "",
    expanded.adminRights ? "Reward admin rights" : "",
    expanded.vaultedTokens ? "Vaulted token claim" : "",
    expanded.remainingSupply ? "Remaining token supply" : "",
  ].filter(Boolean);
}

function DealRoom({ deal, onBack, onChanged }: { deal: DealDetail; onBack: () => void; onChanged: () => void }) {
  const { role } = useRole();
  const { address, sessionAddress } = useWallet();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [platformFeeBps, setPlatformFeeBps] = useState(500);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const step = stageToStep(deal.stageRaw);
  const walletAddress = currentActorAddress({ address, sessionAddress });
  const buyerAddress = deal.buyerAddress.toLowerCase();
  const sellerAddress = deal.sellerAddress.toLowerCase();
  const actorRole = walletAddress === sellerAddress ? "seller" : walletAddress === buyerAddress ? "buyer" : role;
  const isContractBacked = Boolean(deal.contractListingId);
  const isClankerDeal = Boolean(deal.clankerTransfer?.tokenAddress);

  useEffect(() => {
    if (isContractBacked) {
      readPlatformFeeBps("deals").then(setPlatformFeeBps).catch(() => {});
    }
  }, [isContractBacked]);

  const markAsRead = async (ids: string[]) => {
    const unread = ids.filter(id => !seenRef.current.has(id));
    if (unread.length === 0) return;
    unread.forEach(id => seenRef.current.add(id));
    fetch(`/api/deals/${deal.id}/messages/read`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: unread, actorAddress: walletAddress }),
    }).catch(() => {});
  };

  // Pusher real-time subscription
  useEffect(() => {
    let pusher: ReturnType<typeof import("pusher-js").default> | undefined;
    (async () => {
      const Pusher = (await import("pusher-js")).default;
      pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: "/api/pusher/auth",
        auth: { params: { walletAddress } },
      });

      const channel = pusher.subscribe(`private-deal-${deal.id}`);

      channel.bind("new-message", (msg: ChatMessage) => {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          const message = { ...msg, me: msg.senderAddress?.toLowerCase() === walletAddress };
          if (!message.me) markAsRead([msg.id]);
          return [...prev, message];
        });
      });

      channel.bind("messages-read", (data: { messageIds: string[] }) => {
        setMessages(prev => prev.map(m =>
          data.messageIds.includes(m.id) ? { ...m, readAt: new Date().toISOString() } : m
        ));
      });

      channel.bind("stage-change", () => { onChanged(); });
    })();

    return () => {
      if (pusher) {
        pusher.unsubscribe(`private-deal-${deal.id}`);
        pusher.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id, walletAddress]);

  // Initial message load
  useEffect(() => {
    const query = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : "";
    fetch(`/api/deals/${deal.id}/messages${query}`)
      .then(r => r.json())
      .then(json => {
        setMessages(json.data || []);
        setHasMore(json.hasMore);
      })
      .catch(() => {});
  }, [deal.id, walletAddress]);

  const loadMore = async () => {
    if (loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const cursor = messages[0].createdAt;
    const query = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}&cursor=${encodeURIComponent(cursor)}` : `?cursor=${encodeURIComponent(cursor)}`;
    const res = await fetch(`/api/deals/${deal.id}/messages${query}`);
    const json = await res.json();
    setMessages(prev => [...(json.data || []).reverse(), ...prev]);
    setHasMore(json.hasMore);
    setLoadingMore(false);
  };

  // Farcaster Mini App embed for this deal
  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = document.querySelector('meta[name="fc:miniapp"]');
    if (existing) existing.remove();
    const meta = document.createElement("meta");
    meta.name = "fc:miniapp";
    const assetLabel = deal.bundleAssets.length > 0
      ? `${deal.bundleAssets.length}-asset bundle`
      : deal.name.slice(0, 24);
    meta.content = JSON.stringify({
      version: "1",
      imageUrl: "https://baseshirehethaway.com/logo.png",
      button: {
        title: `View ${assetLabel}`,
        action: {
          type: "launch_frame",
          name: "Baseshire Hethaway",
          url: `${window.location.origin}/deals?id=${deal.id}`,
          splashImageUrl: "https://baseshirehethaway.com/logo.png",
          splashBackgroundColor: "#0052ff",
        },
      },
    });
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, [deal.id, deal.name, deal.bundleAssets.length]);

  const checks = deal.bundleAssets.length > 0
    ? deal.bundleAssets.map((a) => ({
        t: `[${a.kind.replace(/_/g, " ")}] ${a.label}`,
        done: false,
        active: false,
      }))
    : deal.includes.map((item, i) => ({ t: item, done: i < step, active: i === step }));
  const canRelease = deal.stageRaw === "awaiting_confirmation" || (checks.length > 0 && checks.every(c => c.done));

  const waitForTx = async (hash: Hash) => {
    await getPublicClient().waitForTransactionReceipt({ hash });
    return hash;
  };

  const contractTxFor = async (path: string) => {
    if (!isContractBacked || path === "confirm") return undefined;
    if (!address) throw new Error("Connect the wallet for this escrow before submitting an on-chain action.");
    const dealId = BigInt(deal.contractListingId || "0");
    const account = address as Address;
    if (path === "proofs") return waitForTx(await writeMarkDelivered(account, dealId));
    if (path === "release") return waitForTx(await writeConfirmDelivery(account, dealId));
    if (path === "refund") return waitForTx(await writeRefundDeal(account, dealId));
    if (path === "dispute") return waitForTx(await writeDisputeDeal(account, dealId));
    return undefined;
  };

  const postEscrowAction = async (path: string, body: Record<string, unknown>, success: string) => {
    setActionBusy(path);
    setActionNotice("");
    try {
      const txHash = await contractTxFor(path);
      const res = await fetch(`/api/escrows/${deal.id}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, actorAddress: walletAddress, ...(txHash ? { txHash } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Escrow action failed");
      setActionNotice(success);
      onChanged();
    } catch (err) {
      setActionNotice(parseContractError(err));
    } finally {
      setActionBusy("");
    }
  };

  const postTransferProof = async (hashes: Hash[], note: string) => {
    const txHash = hashes[hashes.length - 1];
    const res = await fetch(`/api/escrows/${deal.id}/proofs`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proofType: "transfer",
        actorAddress: walletAddress,
        url: `https://basescan.org/tx/${txHash}`,
        contentHash: txHash,
        txHash,
        note: hashes.length > 1 ? `${note}. Transactions: ${hashes.join(", ")}` : note,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Unable to attach transfer proof.");
  };

  const runClankerTransfer = async (kind: "fee" | "admin" | "vault" | "supply") => {
    if (!deal.clankerTransfer?.tokenAddress) return;
    if (!address) {
      setActionNotice("Connect the seller wallet before transferring rights.");
      return;
    }
    const account = address as Address;
    const buyer = deal.buyerAddress as Address;
    const token = deal.clankerTransfer.tokenAddress as Address;
    setActionBusy(`clanker-${kind}`);
    setActionNotice("");
    try {
      let hashes: Hash[] = [];
      let note = "";
      if (kind === "fee") {
        hashes = await transferClankerRewardRecipients({ account, token, buyer, chainId: deal.chainId });
        note = "Clanker creator fee recipient rights transferred to buyer";
      } else if (kind === "admin") {
        const transferErrors: string[] = [];
        try {
          hashes.push(...await transferClankerTokenAdmin({ account, token, buyer, chainId: deal.chainId }));
        } catch (err) {
          transferErrors.push(parseContractError(err));
        }
        try {
          hashes.push(...await transferClankerRewardAdmins({ account, token, buyer, chainId: deal.chainId }));
        } catch (err) {
          transferErrors.push(parseContractError(err));
        }
        if (hashes.length === 0) throw new Error(transferErrors[0] || "No transferable Clanker admin rights were found.");
        note = "Clanker token and reward admin rights transferred to buyer";
      } else if (kind === "vault") {
        const unlockDate = deal.clankerTransfer?.vaultUnlock;
        if (unlockDate && new Date(unlockDate) > new Date()) {
          throw new Error(`Vaulted tokens are locked until ${unlockDate}.`);
        }
        const claimHashes = await claimClankerVaultedTokens({ account, token, chainId: deal.chainId });
        hashes = [...claimHashes];
        if (deal.clankerTransfer.vaultedAmount > 0) {
          try {
            const transferHashes = await transferClankerTokenSupply({
              account,
              token,
              buyer,
              amount: deal.clankerTransfer.vaultedAmount,
              chainId: deal.chainId,
            });
            hashes.push(...transferHashes);
            note = "Clanker vaulted tokens claimed and transferred to buyer";
          } catch (err) {
            note = "Clanker vaulted tokens claimed but supply transfer failed — tokens are in seller wallet. Re-run supply transfer to complete.";
            throw err;
          }
        } else {
          note = "Clanker vaulted tokens claimed by seller";
        }
      } else {
        hashes = await transferClankerTokenSupply({
          account,
          token,
          buyer,
          amount: deal.clankerTransfer.remainingSupply,
          chainId: deal.chainId,
        });
        note = "Clanker remaining token supply transferred to buyer";
      }
      await postTransferProof(hashes, note);
      setActionNotice(`${note}. Proof attached.`);
      onChanged();
    } catch (err) {
      setActionNotice(parseContractError(err));
    } finally {
      setActionBusy("");
    }
  };

  const submitProof = async () => {
    const url = window.prompt("Proof URL");
    if (!url) return;
    const contentHash = window.prompt("Content hash") || "";
    if (!contentHash) {
      setActionNotice("A content hash is required before proof can be attached.");
      return;
    }
    await postEscrowAction("proofs", { proofType: "delivery", url, contentHash }, "Delivery proof attached.");
  };

  const openDispute = async () => {
    const reason = window.prompt("Dispute reason");
    if (!reason) return;
    await postEscrowAction("dispute", { reason }, "Dispute filed. An admin will review this escrow.");
  };

  const sendMsg = async (text?: string) => {
    const body = text || draft;
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorAddress: walletAddress, body }),
      });
      const json = await res.json();
      if (json.data) setMessages(prev => [...prev, json.data]);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const uploadQuery = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : "";
      const uploadRes = await fetch(`/api/deals/${deal.id}/messages/image${uploadQuery}`, {
        method: "POST", credentials: "include", body: form,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || "Upload failed");

      const res = await fetch(`/api/deals/${deal.id}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorAddress: walletAddress,
          messageType: "image",
          imageUrl: uploadJson.url,
          body: file.name,
        }),
      });
      const json = await res.json();
      if (json.data) setMessages(prev => [...prev, json.data]);
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 14 }}>
        ← Back to deals
      </button>

      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="eyebrow">Deal Room · {deal.type}</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            {deal.name} <span className="muted-2 mono" style={{ fontSize: 18 }}>· {deal.id}</span>
          </h1>
          {deal.isBundle && (
            <span className="pill" style={{ marginTop: 6, background: "color-mix(in oklab, var(--accent) 12%, transparent)", color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
              {deal.bundleAssets.length}-asset bundle
            </span>
          )}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn ghost" onClick={openDispute} disabled={Boolean(actionBusy)}><Icon.warn /> Open dispute</button>
          <button className="btn" onClick={() => window.open("/contracts/VaultEscrow.sol", "_blank")}>Download contract</button>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <span className="eyebrow">Escrow Timeline</span>
          <span className="muted" style={{ fontSize: 12 }}>Step {step + 1} of 5</span>
        </div>
        <div className="steps">
          {DEAL_STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={"step" + (i < step ? " done" : i === step ? " active" : "")}>
                <span className="num">{i < step ? "✓" : i + 1}</span>
                <span>{s}</span>
              </div>
              {i < 4 && <div className="ln" style={{ flex: 1, height: 1, background: i < step ? "var(--accent)" : "var(--line)", margin: "0 14px" }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="row between">
              <div>
                <div className="eyebrow">Asset Overview</div>
                <h3 className="serif" style={{ fontSize: 22, margin: "8px 0" }}>{deal.name}</h3>
              </div>
              <span className="pill gold">{deal.bundleAssets.length > 0 ? <><Icon.shield style={{ width: 12, height: 12, marginRight: 4 }} />{deal.bundleAssets.length} assets</> : "Buyer confirms"}</span>
            </div>
            <div className="grid grid-3" style={{ marginTop: 12 }}>
              <div className="metric"><span className="lab">Amount</span><span className="val">{fmtUSDC(deal.price)} {deal.currency}</span><span className="delta">escrow value</span></div>
              <div className="metric"><span className="lab">Monthly fees</span><span className="val">{fmtUSDC(deal.mrr)} {deal.currency}</span><span className="delta">seller-provided</span></div>
              <div className="metric"><span className="lab">Chain</span><span className="val" style={{ fontSize: 16 }}>{deal.chain}</span><span className="delta">escrow network</span></div>
            </div>
            {deal.isBundle && deal.bundleAssets.length > 0 && (
              <>
                <hr className="hr" style={{ margin: "18px 0" }} />
                <div className="eyebrow" style={{ marginBottom: 10 }}>Bundle assets ({deal.bundleAssets.length})</div>
                <div className="col" style={{ gap: 4 }}>
                  {deal.bundleAssets.map((a) => (
                    <div key={a.id} className="row" style={{ gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                      <span className="smallcaps" style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", minWidth: 76 }}>
                        {a.kind.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</span>
                      {a.detail && <span className="muted-2" style={{ fontSize: 11, marginLeft: "auto" }}>{a.detail}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
            <hr className="hr" style={{ margin: "18px 0" }} />
            {isClankerDeal && deal.clankerTransfer && (
              <>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Clanker rights transfer</div>
                <div style={{ padding: 14, marginBottom: 18, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8 }}>
                  <div className="row between" style={{ gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>{deal.clankerTransfer.tokenAddress}</div>
                      <div className="muted-2" style={{ fontSize: 11, marginTop: 4 }}>
                        Included: {clankerRightLabels(deal.clankerTransfer.saleRights).join(", ") || "No rights selected"}
                      </div>
                    </div>
                    <span className="pill gold">{deal.clankerTransfer.symbol || "CLANKER"}</span>
                  </div>
                  {actorRole === "seller" ? (
                    <div className="grid grid-2" style={{ gap: 8, marginTop: 12 }}>
                      {selectedRights(deal.clankerTransfer.saleRights).feeRights && (
                        <button className="btn sm" onClick={() => runClankerTransfer("fee")} disabled={Boolean(actionBusy)}>
                          {actionBusy === "clanker-fee" ? "Transferring..." : "Transfer fee rights"}
                        </button>
                      )}
                      {selectedRights(deal.clankerTransfer.saleRights).adminRights && (
                        <button className="btn sm" onClick={() => runClankerTransfer("admin")} disabled={Boolean(actionBusy)}>
                          {actionBusy === "clanker-admin" ? "Transferring..." : "Transfer admin rights"}
                        </button>
                      )}
                      {selectedRights(deal.clankerTransfer.saleRights).vaultedTokens && (
                        <div className="col" style={{ gap: 4 }}>
                          <button className="btn sm" onClick={() => runClankerTransfer("vault")} disabled={Boolean(actionBusy)}>
                            {actionBusy === "clanker-vault" ? "Claiming..." : `Claim ${deal.clankerTransfer.vaultedAmount ? `${deal.clankerTransfer.vaultedAmount.toLocaleString()} ` : ""}vaulted tokens`}
                          </button>
                          {deal.clankerTransfer.vaultUnlock && new Date(deal.clankerTransfer.vaultUnlock) > new Date() && (
                            <span className="muted" style={{ fontSize: 11 }}>Locked until {new Date(deal.clankerTransfer.vaultUnlock).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                      {selectedRights(deal.clankerTransfer.saleRights).remainingSupply && (
                        <button className="btn sm" onClick={() => runClankerTransfer("supply")} disabled={Boolean(actionBusy)}>
                          {actionBusy === "clanker-supply" ? "Transferring..." : `Transfer ${deal.clankerTransfer.remainingSupply || ""} ${deal.clankerTransfer.symbol}`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="muted-2" style={{ fontSize: 11, marginTop: 10 }}>
                      Waiting for the seller to transfer the selected Clanker rights and attach on-chain proof.
                    </div>
                  )}
                </div>
              </>
            )}
            <hr className="hr" style={{ margin: "18px 0" }} />
            <div className="eyebrow" style={{ marginBottom: 10 }}>Deliverables checklist</div>
            <div>
              {checks.length === 0 && <div className="muted" style={{ padding: 18, textAlign: "center" }}>No deliverables have been attached to this deal yet.</div>}
              {checks.map((c, i) => (
                <div key={i} className={"check" + (c.done ? " done" : "")}>
                  <span className="box">{c.done && <Icon.check style={{ width: 12, height: 12 }} />}</span>
                  <div className="col" style={{ flex: 1, gap: 1 }}>
                    <span style={{ color: c.done ? "var(--ink)" : "var(--ink-2)" }}>{c.t}</span>
                    {c.active && <span className="muted-2" style={{ fontSize: 11 }}>
                      {role === "buyer" ? "Buyer needs to confirm receipt" : "Waiting for buyer confirmation"}
                    </span>}
                  </div>
                  {c.active && actorRole === "buyer" && (
                    <button className="btn primary sm" onClick={() => postEscrowAction("confirm", {}, "Receipt confirmed.")} disabled={Boolean(actionBusy)}>
                      {actionBusy === "confirm" ? "Confirming..." : "Confirm"}
                    </button>
                  )}
                  {!c.done && actorRole === "seller" && (
                    <button className="btn sm ghost" onClick={submitProof} disabled={Boolean(actionBusy)}>
                      {actionBusy === "proofs" ? (isContractBacked ? "Confirming..." : "Uploading...") : "Add proof"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", height: 480 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Deal Room Chat</span>
              <span className="muted-2" style={{ fontSize: 11 }}>End-to-end encrypted · 2 participants</span>
            </div>
            <MessageScrollerProvider autoScroll defaultScrollPosition="end">
              <MessageScroller className="deal-message-scroller">
                <MessageScrollerViewport aria-label="Deal room messages">
                  <MessageScrollerContent className="deal-message-content">
                    {hasMore && (
                      <MessageScrollerItem>
                        <button className="btn ghost sm" onClick={loadMore} disabled={loadingMore} style={{ margin: "0 auto 4px", fontSize: 11 }}>
                          {loadingMore ? "Loading..." : "Load earlier messages"}
                        </button>
                      </MessageScrollerItem>
                    )}
                    {messages.map((m, index) => (
                      <MessageScrollerItem
                        key={m.id}
                        messageId={m.id}
                        scrollAnchor={index === messages.length - 1}
                      >
                        <MessageGroup>
                          <Message align={m.me ? "end" : "start"}>
                            <MessageContent>
                              <MessageHeader>
                                {m.sender} · {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </MessageHeader>
                              <div className={"bubble" + (m.me ? " me" : "")}>
                                {m.messageType === "image" && m.imageUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={m.imageUrl} alt="attachment" />
                                ) : (
                                  m.body
                                )}
                              </div>
                              {m.readAt && m.me && (
                                <MessageFooter>
                                  <span className="read-receipt">Read</span>
                                </MessageFooter>
                              )}
                            </MessageContent>
                          </Message>
                        </MessageGroup>
                      </MessageScrollerItem>
                    ))}
                    {messages.length === 0 && (
                      <MessageScrollerItem scrollAnchor>
                        <Empty className="deal-empty-state">
                          <EmptyHeader>
                            <EmptyMedia variant="icon"><Icon.send /></EmptyMedia>
                            <EmptyTitle>No messages yet</EmptyTitle>
                            <EmptyDescription>Start the conversation with the buyer or seller.</EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </MessageScrollerItem>
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
            <div className="row" style={{ gap: 4, flexWrap: "wrap", padding: "6px 0" }}>
              {["I've paid", "Please release", "Received, thanks", "Checking now"].map(q => (
                <button key={q} className="btn ghost sm" style={{ fontSize: 11 }} onClick={() => sendMsg(q)} disabled={sending}>{q}</button>
              ))}
            </div>
            <div className="row" style={{ gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <label className="btn ghost sm" style={{ cursor: "pointer" }} title="Attach image">
                {uploading ? "..." : "📎"}
                <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
              </label>
              <Textarea
                className="deal-message-textarea"
                placeholder="Send a message..."
                aria-label="Send a message"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMsg();
                  }
                }}
              />
              <button className="btn primary" onClick={() => sendMsg()} disabled={sending}><Icon.send /></button>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Funds in escrow</div>
            <div className="kv"><Label className="k">Buyer deposit</Label><span className="v">{fmtUSDC(deal.price)} {deal.currency}</span></div>
            <div className="kv"><Label className="k">Platform fee ({platformFeeBps / 100}%)</Label><span className="v">{fmtUSDC(deal.price * platformFeeBps / 10000)} {deal.currency}</span></div>
            <div className="kv"><Label className="k">Net to seller</Label><span className="v" style={{ color: "var(--accent)" }}>{fmtUSDC(deal.price * (1 - platformFeeBps / 10000))} {deal.currency}</span></div>
            {actionNotice && <div className="warn-banner" style={{ marginTop: 12, fontSize: 12 }}>{actionNotice}</div>}
            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              {actorRole === "buyer" ? (
                <>
                  <button className="btn primary" style={{ flex: 1 }} onClick={() => postEscrowAction("release", {}, "Funds released in the escrow ledger.")} disabled={!canRelease || Boolean(actionBusy)}>
                    {actionBusy === "release" ? (isContractBacked ? "Confirming..." : "Releasing...") : "Release funds"}
                  </button>
                  <button className="btn danger" style={{ flex: 1 }} onClick={openDispute} disabled={Boolean(actionBusy)}>Open dispute</button>
                </>
              ) : (
                <>
                  <button className="btn primary" style={{ flex: 1 }} onClick={submitProof} disabled={Boolean(actionBusy)}>
                    {actionBusy === "proofs" ? (isContractBacked ? "Confirming..." : "Submitting...") : "Submit proof"}
                  </button>
                  <button className="btn danger" style={{ flex: 1 }} onClick={openDispute} disabled={Boolean(actionBusy)}>Open dispute</button>
                </>
              )}
            </div>
            <button className="btn sm" style={{ marginTop: 8, width: "100%" }} onClick={() => shareAsCast(
              `${deal.name} — ${deal.amount} ${deal.currency} deal on Vault`,
              `${window.location.origin}/deals?id=${deal.id}`
            )}>
              <Icon.cast style={{ width: 12, height: 12 }} /> Share on Farcaster
            </button>
            <div className="muted-2" style={{ fontSize: 11, marginTop: 10, textAlign: "center" }}>
              Funds release is permanent. Only release after confirming the negotiated deliverables.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

function shortWallet(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function profileOfferMessage(offer: ProfileOffer): SignedLoanOfferMessage | SignedDealOfferMessage | null {
  const typedData = typeof offer.typedData === "string"
    ? JSON.parse(offer.typedData)
    : offer.typedData as { message?: Record<string, unknown> } | undefined;
  const msg = typedData?.message;
  if (!msg) return null;
  if (offer.marketplace === "nft_loan") {
    return {
      listingId: BigInt(String(msg.listingId)),
      lender: String(msg.lender) as Address,
      amount: BigInt(String(msg.amount)),
      apr: BigInt(String(msg.apr)),
      term: BigInt(String(msg.term)),
      expiry: BigInt(String(msg.expiry)),
      nonce: BigInt(String(msg.nonce)),
    };
  }
  return {
    dealId: BigInt(String(msg.dealId)),
    buyer: String(msg.buyer) as Address,
    amount: BigInt(String(msg.amount)),
    expiry: BigInt(String(msg.expiry)),
    nonce: BigInt(String(msg.nonce)),
  };
}

async function loadOfferAcceptPayload(offerId: string, actorAddress?: string | null): Promise<ProfileOfferAcceptPayload> {
  const res = await fetch(`/api/offers/${encodeURIComponent(offerId)}/accept-payload`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorAddress }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Unable to load offer accept payload");
  return json.data as ProfileOfferAcceptPayload;
}

async function loadOffersForListing(listingId: string): Promise<ProfileOffer[]> {
  const res = await fetch(`/api/offers?listingId=${encodeURIComponent(listingId)}`, { credentials: "include" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return (json.data || []).filter((offer: ProfileOffer) => offer.status === "pending");
}

async function loadProfileListings(address: string): Promise<ProfileListing[]> {
  const seller = address.toLowerCase();
  const [
    loansResult,
    miniAppsResult,
    xAccountsResult,
    farcasterResult,
    clankerResult,
    bundlesResult,
  ] = await Promise.allSettled([
    fetch(`/api/listings?sellerAddress=${encodeURIComponent(address)}&includeOffchain=true`, { credentials: "include" }).then((r) => r.json()),
    fetch(`/api/marketplace/mini-apps?sellerAddress=${encodeURIComponent(address)}&includeOffchain=true`, { credentials: "include" }).then((r) => r.json()),
    fetch(`/api/marketplace/x-accounts?sellerAddress=${encodeURIComponent(address)}&includeOffchain=true`, { credentials: "include" }).then((r) => r.json()),
    fetch(`/api/marketplace/farcaster?sellerAddress=${encodeURIComponent(address)}&includeOffchain=true`, { credentials: "include" }).then((r) => r.json()),
    fetch(`/api/marketplace/clanker?sellerAddress=${encodeURIComponent(address)}&includeOffchain=true`, { credentials: "include" }).then((r) => r.json()),
    fetch(`/api/marketplace/bundles?sellerAddress=${encodeURIComponent(address)}&includeOffchain=true`, { credentials: "include" }).then((r) => r.json()),
  ]);

  const dataFrom = <T,>(result: PromiseSettledResult<{ data?: T[] }>) =>
    result.status === "fulfilled" ? result.value.data || [] : [];

  const mine = <T extends { sellerAddress?: string; borrower?: string }>(items: T[]) =>
    items.filter((item) =>
      item.sellerAddress?.toLowerCase() === seller ||
      item.borrower?.toLowerCase() === seller
    );

  const listings = [
    ...mine(dataFrom<ProfileLoan>(loansResult)).map((listing) => ({
      id: listing.id,
      kind: "NFT loan",
      shareKind: "nft" as const,
      title: `${listing.collection || "NFT"} ${listing.token}`,
      price: listing.amt,
      currency: "USDC",
      status: listing.status,
      href: `/detail?id=${encodeURIComponent(listing.id)}`,
      sellerAddress: listing.sellerAddress,
      contractListingId: listing.contractListingId,
      cancelPath: `/api/listings/${encodeURIComponent(listing.id)}`,
      cancelMethod: "PATCH" as const,
      offers: [],
    })),
    ...mine(dataFrom<MiniApp>(miniAppsResult)).map((listing) => ({
      id: listing.id,
      kind: "Mini app",
      shareKind: "miniapps" as const,
      title: listing.name,
      price: listing.price,
      currency: "USDC",
      status: listing.txStatus || "active",
      href: `/miniapps?id=${encodeURIComponent(listing.id)}`,
      sellerAddress: listing.sellerAddress,
      contractListingId: listing.contractListingId,
      cancelPath: `/api/listings/${encodeURIComponent(listing.id)}`,
      cancelMethod: "PATCH" as const,
      offers: [],
    })),
    ...mine(dataFrom<XAccount>(xAccountsResult)).map((listing) => ({
      id: listing.id,
      kind: "X account",
      shareKind: "x" as const,
      title: listing.handle,
      price: listing.price,
      currency: "USDC",
      status: listing.txStatus || "active",
      href: `/x?id=${encodeURIComponent(listing.id)}`,
      sellerAddress: listing.sellerAddress,
      contractListingId: listing.contractListingId,
      cancelPath: `/api/listings/${encodeURIComponent(listing.id)}`,
      cancelMethod: "PATCH" as const,
      offers: [],
    })),
    ...mine(dataFrom<FarcasterAccount>(farcasterResult)).map((listing) => ({
      id: listing.id,
      kind: "Farcaster",
      shareKind: "farcaster" as const,
      title: `@${listing.handle}`,
      price: listing.price,
      currency: "USDC",
      status: listing.txStatus || "active",
      href: `/farcaster?id=${encodeURIComponent(listing.id)}`,
      sellerAddress: listing.sellerAddress,
      contractListingId: listing.contractListingId,
      cancelPath: `/api/listings/${encodeURIComponent(listing.id)}`,
      cancelMethod: "PATCH" as const,
      offers: [],
    })),
    ...mine(dataFrom<ClankerToken>(clankerResult)).map((listing) => ({
      id: listing.id,
      kind: "Clanker",
      shareKind: "clanker" as const,
      title: `${listing.name}${listing.symbol ? ` (${listing.symbol})` : ""}`,
      price: listing.price,
      currency: "USDC",
      status: listing.txStatus || "active",
      href: `/clanker?id=${encodeURIComponent(listing.id)}`,
      sellerAddress: listing.sellerAddress,
      contractListingId: listing.contractListingId,
      cancelPath: `/api/listings/${encodeURIComponent(listing.id)}`,
      cancelMethod: "PATCH" as const,
      offers: [],
    })),
    ...mine(dataFrom<BundleListing>(bundlesResult)).map((listing) => ({
      id: listing.id,
      kind: "Bundle",
      shareKind: "bundles" as const,
      title: listing.name,
      price: listing.totalPrice,
      currency: listing.currency || "USDC",
      status: listing.txStatus || "active",
      href: `/market?tab=bundles&id=${encodeURIComponent(listing.id)}`,
      sellerAddress: listing.sellerAddress,
      contractListingId: listing.contractListingId,
      cancelPath: `/api/listings/bundle?id=${encodeURIComponent(listing.id)}`,
      cancelMethod: "DELETE" as const,
      offers: [],
    })),
  ];
  const uniqueListings = Array.from(
    listings
      .reduce((map, listing) => {
        const key = `${listing.shareKind}:${listing.id}`;
        if (!map.has(key)) map.set(key, listing);
        return map;
      }, new Map<string, ProfileListing>())
      .values()
  );
  const offers = await Promise.all(uniqueListings.map((listing) => loadOffersForListing(listing.id)));
  return uniqueListings.map((listing, index) => ({ ...listing, offers: offers[index] || [] }));
}

function shareUrlForProfileListing(listing: ProfileListing) {
  const url = new URL(
    listing.shareKind === "nft" ? "/detail" :
    listing.shareKind === "miniapps" ? "/miniapps" :
    listing.shareKind === "x" ? "/x" :
    listing.shareKind === "farcaster" ? "/farcaster" :
    listing.shareKind === "clanker" ? "/clanker" :
    "/market",
    window.location.origin
  );
  if (listing.shareKind === "bundles") url.searchParams.set("tab", "bundles");
  url.searchParams.set("id", listing.id);
  return url.toString();
}

function profileListingIcon(kind: ProfileListing["shareKind"]) {
  if (kind === "nft") return <Icon.loan />;
  if (kind === "miniapps") return <Icon.app />;
  if (kind === "x") return <Icon.xlogo />;
  if (kind === "farcaster") return <Icon.cast />;
  if (kind === "clanker") return <Icon.token />;
  return <Icon.shield />;
}

export default function DealsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedDealId = searchParams.get("id");
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("active");
  const [stage, setStage] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [dealDetail, setDealDetail] = useState<DealDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [profileListings, setProfileListings] = useState<ProfileListing[]>([]);
  const [profileMessageListing, setProfileMessageListing] = useState<ProfileListing | null>(null);
  const [profileShareListing, setProfileShareListing] = useState<ProfileListing | null>(null);
  const [profileMessageBuyer, setProfileMessageBuyer] = useState("");
  const [listingInbox, setListingInbox] = useState<ListingInboxThread[]>([]);
  const [outgoingOffers, setOutgoingOffers] = useState<ProfileOffer[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingNotice, setListingNotice] = useState("");
  const [listingAction, setListingAction] = useState("");
  const [offerAction, setOfferAction] = useState("");
  const { isConnected, isConnecting, connect, role, address, sessionAddress } = useWallet();
  const actorAddress = React.useMemo(() => currentActorAddress({ address, sessionAddress }), [address, sessionAddress]);

  const loadEscrows = React.useCallback(() => {
    const query = actorAddress ? `?walletAddress=${encodeURIComponent(actorAddress)}` : "";
    return fetch(`/api/escrows${query}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load deals");
        return json;
      })
      .then((json) => { setEscrows(json.data || []); setLoading(false); });
  }, [actorAddress]);

  useEffect(() => {
    if (!isConnected || !role) { queueMicrotask(() => { setLoading(false); setError("Authentication required"); }); return; }
    queueMicrotask(() => { setLoading(true); setError(""); });
    loadEscrows()
      .catch((err) => { setError(err instanceof Error ? err.message : "Unable to load deals"); setLoading(false); });
  }, [isConnected, role, loadEscrows]);

  const refreshProfileListings = React.useCallback(() => {
    if (!actorAddress) {
      setProfileListings([]);
      return Promise.resolve();
    }
    setListingsLoading(true);
    return loadProfileListings(actorAddress)
      .then(setProfileListings)
      .catch((err) => setListingNotice(err instanceof Error ? err.message : "Unable to load active listings"))
      .finally(() => setListingsLoading(false));
  }, [actorAddress]);

  const refreshOutgoingOffers = React.useCallback(() => {
    if (!actorAddress) {
      setOutgoingOffers([]);
      return Promise.resolve();
    }
    return fetch(`/api/offers?offererAddress=${encodeURIComponent(actorAddress)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setOutgoingOffers((json.data || []).filter((offer: ProfileOffer) => offer.status === "pending")))
      .catch(() => setOutgoingOffers([]));
  }, [actorAddress]);

  const refreshListingInbox = React.useCallback(() => {
    if (!actorAddress) {
      setListingInbox([]);
      return Promise.resolve();
    }
    return fetch(`/api/listings/messages?walletAddress=${encodeURIComponent(actorAddress)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setListingInbox(json.data || []))
      .catch(() => setListingInbox([]));
  }, [actorAddress]);

  useEffect(() => {
    queueMicrotask(() => {
      refreshProfileListings();
      refreshOutgoingOffers();
      refreshListingInbox();
    });
  }, [refreshListingInbox, refreshOutgoingOffers, refreshProfileListings]);

  useEffect(() => {
    if (linkedDealId) queueMicrotask(() => setSelectedDealId(linkedDealId));
  }, [linkedDealId]);

  useEffect(() => {
    if (!selectedDealId) { queueMicrotask(() => setDealDetail(null)); return; }
    queueMicrotask(() => setDetailLoading(true));
    const query = actorAddress ? `?walletAddress=${encodeURIComponent(actorAddress)}` : "";
    fetch(`/api/escrows/${selectedDealId}${query}`)
      .then(r => r.json())
      .then(json => { setDealDetail(json.data || null); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  }, [actorAddress, selectedDealId]);

  /* -- computed -- */
  const active     = escrows.filter(e => e.stage !== "Released" && e.stage !== "Refunded");
  const needsAct   = escrows.filter(e => e.action !== "On schedule" && e.action !== "None");
  const totalLocked = active.reduce((s, e) => s + e.amount, 0);
  const completed   = escrows.filter(e => e.stage === "Released").length;
  const activeListingCount = profileListings.length;

  const viewFiltered = filterByView(escrows, view);
  const stageFiltered = stage === "all"
    ? viewFiltered
    : viewFiltered.filter(e => e.stage === stage);
  const filt = search.trim()
    ? stageFiltered.filter(e =>
        e.id.toLowerCase().includes(search.toLowerCase()) ||
        e.asset.toLowerCase().includes(search.toLowerCase()) ||
        e.party.toLowerCase().includes(search.toLowerCase())
      )
    : stageFiltered;

  const cancelListing = async (listing: ProfileListing) => {
    if (!window.confirm(`Cancel ${listing.title}?`)) return;
    setListingNotice("");
    setListingAction(listing.id);
    try {
      let txHash: Hash | undefined;
      if (listing.contractListingId) {
        if (!address) throw new Error("Connect the seller wallet before cancelling this on-chain listing.");
        const account = address as Address;
        const contractId = BigInt(listing.contractListingId);
        txHash = listing.shareKind === "nft"
          ? await writeCancelListing(account, contractId)
          : listing.shareKind === "miniapps"
            ? await writeCancelMiniApp(account, contractId)
            : await writeCancelDeal(account, contractId);
        await getPublicClient().waitForTransactionReceipt({ hash: txHash });
      }
      const res = await fetch(listing.cancelPath, {
        method: listing.cancelMethod,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", action: "cancel_listing", actorAddress, txHash }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to cancel listing");
      setListingNotice(txHash ? "Listing cancelled on-chain." : "Listing cancelled.");
      await refreshProfileListings();
    } catch (err) {
      setListingNotice(parseContractError(err));
    } finally {
      setListingAction("");
    }
  };

  const shareListing = (listing: ProfileListing) => {
    setListingNotice("");
    setProfileShareListing(listing);
  };

  const patchOfferStatus = async (offer: ProfileOffer, status: "accepted" | "rejected" | "cancelled", txHash?: Hash) => {
    const res = await fetch("/api/offers", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: offer.id, status, actorAddress, txHash }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Unable to update offer");
  };

  const acceptProfileOffer = async (offer: ProfileOffer) => {
    if (!address) return;
    setOfferAction(offer.id);
    setListingNotice("");
    try {
      const payload = await loadOfferAcceptPayload(offer.id, actorAddress);
      const message = profileOfferMessage({ ...offer, ...payload });
      if (!message) throw new Error("Offer typed data is missing.");
      const txHash = payload.marketplace === "nft_loan"
        ? await writeAcceptSignedLoanOffer(address as Address, message as SignedLoanOfferMessage, payload.signature)
        : await writeAcceptSignedDealOffer(address as Address, message as SignedDealOfferMessage, payload.signature);
      await getPublicClient().waitForTransactionReceipt({ hash: txHash });
      await patchOfferStatus(offer, "accepted", txHash);
      setListingNotice(offer.marketplace === "nft_loan"
        ? "Offer accepted and loan activated."
        : "Offer accepted. Buyer funds are locked in escrow until delivery is confirmed.");
      await Promise.all([refreshProfileListings(), refreshOutgoingOffers(), loadEscrows()]);
    } catch (err) {
      setListingNotice(parseContractError(err));
    } finally {
      setOfferAction("");
    }
  };

  const rejectProfileOffer = async (offer: ProfileOffer) => {
    setOfferAction(offer.id);
    setListingNotice("");
    try {
      await patchOfferStatus(offer, "rejected");
      setListingNotice("Offer rejected.");
      await refreshProfileListings();
    } catch (err) {
      setListingNotice(err instanceof Error ? err.message : "Unable to reject offer");
    } finally {
      setOfferAction("");
    }
  };

  const cancelOutgoingOffer = async (offer: ProfileOffer) => {
    if (!address) return;
    setOfferAction(offer.id);
    setListingNotice("");
    try {
      if (offer.nonce) {
        const nonce = BigInt(offer.nonce);
        const txHash = offer.marketplace === "nft_loan"
          ? await writeCancelNftOfferNonce(address as Address, nonce)
          : await writeCancelDealOfferNonce(address as Address, nonce);
        await getPublicClient().waitForTransactionReceipt({ hash: txHash });
      }
      await patchOfferStatus(offer, "cancelled");
      setListingNotice("Offer cancelled.");
      await refreshOutgoingOffers();
    } catch (err) {
      setListingNotice(parseContractError(err));
    } finally {
      setOfferAction("");
    }
  };

  /* -- render -- */
  if (loading) return <main id="main-content" role="main" aria-label="Main content" className="main"><div className="muted" style={{ padding: 80, textAlign: "center" }}>Loading…</div></main>;
  if (error)   return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      <div className="card" style={{ maxWidth: 520, margin: "60px auto", padding: 36, textAlign: "center" }}>
        <div className="col" style={{ gap: 14, alignItems: "center" }}>
          <Icon.shield style={{ width: 40, height: 40, color: "var(--ink-4)" }} />
          <div>
            <h2 className="serif" style={{ fontSize: 22, marginBottom: 6 }}>
              {isConnected ? "Session expired" : "Wallet not connected"}
            </h2>
            <p className="muted" style={{ fontSize: 13, maxWidth: 360 }}>
              {isConnected
                ? "Your wallet is connected but your session expired. Sign in again to view your deals."
                : "Connect your wallet and sign in to view your deals and escrows."}
            </p>
          </div>
          <button className="btn primary" onClick={connect} disabled={isConnecting}>
            {isConnecting ? "Connecting…" : isConnected ? "Sign in" : "Connect wallet"}
          </button>
        </div>
      </div>
    </main>
  );

  return (
    <main id="main-content" role="main" aria-label="Main content" className="main">
      {/* ---- header ---- */}
      <div className="row between" style={{ alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="eyebrow">Profile</div>
          <h1 className="h2" style={{ marginTop: 8 }}>My deals</h1>
        </div>
      </div>

      {/* ---- metrics ---- */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="metric">
          <span className="lab">Funds locked</span>
          <span className="val">{fmtUSDC(totalLocked)} USDC</span>
          <span className="delta">across {active.length} active deals</span>
        </div>
        <div className="metric">
          <span className="lab">Needs action</span>
          <span className="val" style={{ color: needsAct.length ? "var(--warn)" : undefined }}>{needsAct.length}</span>
          <span className="delta down">disputes &amp; confirmations</span>
        </div>
        <div className="metric">
          <span className="lab">Completed</span>
          <span className="val">{completed}</span>
          <span className="delta">released deals</span>
        </div>
        <div className="metric">
          <span className="lab">Active listings</span>
          <span className="val">{activeListingCount}</span>
          <span className="delta">listed from {shortWallet(actorAddress || "")}</span>
        </div>
      </div>

      {/* ---- action required ---- */}
      {!selectedDealId && needsAct.length > 0 && (
        <section className="col" style={{ gap: 10, marginBottom: 22 }}>
          <span className="smallcaps">Action Required</span>
          <div className="grid grid-2" style={{ gap: 10 }}>
            {needsAct.slice(0, 2).map(e => (
              <div key={e.id} className="card row between" style={{ padding: 14, borderLeft: "3px solid var(--warn)" }}>
                <div className="col" style={{ gap: 2 }}>
                  <span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{e.id} · {e.asset}</span>
                  <span style={{ fontSize: 12 }}>{e.action}</span>
                </div>
                <button className="btn primary sm" onClick={() => setSelectedDealId(e.id)}>Resolve →</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!selectedDealId && (
        <section className="card profile-listings-card">
          <div className="row between profile-listings-head">
            <div>
              <div className="eyebrow">My listings</div>
              <h2 className="serif" style={{ fontSize: 22, margin: "4px 0 0" }}>Active listings</h2>
            </div>
            <Link href="/market" className="btn primary sm">List asset</Link>
          </div>
          {listingNotice && <div className="warn-banner" style={{ margin: "0 18px 12px", fontSize: 12 }}>{listingNotice}</div>}
          {listingsLoading ? (
            <div className="muted" style={{ padding: 22, textAlign: "center" }}>Loading listings...</div>
          ) : profileListings.length === 0 ? (
            <Empty className="profile-empty-state">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Icon.asset /></EmptyMedia>
                <EmptyTitle>No active listings yet</EmptyTitle>
                <EmptyDescription>List an asset to start receiving offers from buyers.</EmptyDescription>
              </EmptyHeader>
              <Link href="/market" className="btn sm">Create listing</Link>
            </Empty>
          ) : (
            <div className="profile-listings profile-listings-grid">
              {profileListings.map((listing) => (
                <div key={`${listing.kind}-${listing.id}`} className="profile-listing-item">
                  <ListingFeedCard
                    href={listing.href}
                    icon={profileListingIcon(listing.shareKind)}
                    title={listing.title}
                    subtitle={listing.kind}
                    stats={[
                      { label: "Status", value: listing.status },
                      { label: "Offers", value: listing.offers.length },
                      { label: "ID", value: listing.id },
                    ]}
                    price={fmtUSDC(listing.price)}
                    priceMeta={listing.currency}
                    actions={
                      <>
                        <Link href={listing.href} className="btn primary sm" aria-label={`View ${listing.title}`}>
                          <Icon.arrow /> View
                        </Link>
                        <button type="button" className="btn sm" onClick={() => shareListing(listing)} aria-label={`Share ${listing.title}`}>
                          <Icon.share /> Share
                        </button>
                        <button type="button" className="btn sm" onClick={() => { setProfileMessageBuyer(""); setProfileMessageListing(listing); }} aria-label={`Messages for ${listing.title}`}>
                          <Icon.send /> Msg
                        </button>
                        <button type="button" className="btn danger sm" onClick={() => cancelListing(listing)} disabled={listingAction === listing.id} aria-label={`Cancel ${listing.title}`}>
                          {listingAction === listing.id ? <Icon.clock /> : <Icon.x />} Cancel
                        </button>
                      </>
                    }
                  >
                  {listing.offers.length > 0 && (
                    <div className="profile-offers">
                      {listing.offers.map((offer) => (
                        <div key={offer.id} className="profile-offer-row">
                          <div>
                            <strong>{fmtUSDC(offer.amt)} USDC offer</strong>
                            <small>
                              {shortWallet(offer.offererAddress)}
                              {offer.apr > 0 ? ` · ${offer.apr}% APR` : ""}
                              {offer.term > 0 ? ` · ${offer.term} days` : ""}
                            </small>
                          </div>
                          <div className="row" style={{ gap: 8 }}>
                            <button className="btn sm" onClick={() => rejectProfileOffer(offer)} disabled={offerAction === offer.id}>
                              Reject
                            </button>
                            <button className="btn primary sm" onClick={() => acceptProfileOffer(offer)} disabled={offerAction === offer.id}>
                              {offerAction === offer.id ? "Working..." : "Accept"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </ListingFeedCard>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!selectedDealId && listingInbox.length > 0 && (
        <section className="card profile-listings-card">
          <div className="profile-listings-head">
            <div className="eyebrow">Pre-deal messages</div>
            <h2 className="serif" style={{ fontSize: 22, margin: "4px 0 0" }}>Listing inbox</h2>
          </div>
          <div className="profile-listings">
            {listingInbox.map((thread) => (
              <button
                key={`${thread.listingId}-${thread.buyerAddress}`}
                type="button"
                className="profile-listing-item"
                style={{ textAlign: "left" }}
                onClick={() => {
                  setProfileMessageBuyer(thread.role === "seller" ? thread.buyerAddress : "");
                  setProfileMessageListing({
                    id: thread.listingId,
                    kind: thread.marketplace || "Listing",
                    shareKind: "miniapps",
                    title: thread.listingTitle,
                    price: 0,
                    currency: "USDC",
                    status: "active",
                    href: `/market?id=${encodeURIComponent(thread.listingId)}`,
                    cancelPath: `/api/listings/${encodeURIComponent(thread.listingId)}`,
                    cancelMethod: "PATCH",
                    sellerAddress: thread.sellerAddress,
                    contractListingId: "",
                    offers: [],
                  });
                }}
              >
                <div className="profile-listing-row">
                  <div>
                    <span className="smallcaps">{thread.role === "seller" ? "Buyer thread" : "Seller thread"}</span>
                    <strong>{thread.listingTitle}</strong>
                    <small>
                      {thread.counterpartyName} · {thread.lastSenderName}: {thread.preview}
                    </small>
                  </div>
                  {thread.unreadCount > 0 && (
                    <span className="pill warn">{thread.unreadCount} new</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!selectedDealId && outgoingOffers.length > 0 && (
        <section className="card profile-listings-card">
          <div className="profile-listings-head">
            <div className="eyebrow">My offers</div>
            <h2 className="serif" style={{ fontSize: 22, margin: "4px 0 0" }}>Outgoing offers</h2>
          </div>
          <div className="profile-listings">
            {outgoingOffers.map((offer) => (
              <div key={offer.id} className="profile-offer-row">
                <div>
                  <span className="smallcaps">{offer.marketplace === "nft_loan" ? "NFT loan" : "P2P market"}</span>
                  <strong>{fmtUSDC(offer.amt)} USDC offer</strong>
                  <small>
                    {offer.status}
                    {offer.expiresAt ? ` · expires ${new Date(offer.expiresAt).toLocaleString()}` : ""}
                  </small>
                </div>
                <button className="btn sm" onClick={() => cancelOutgoingOffer(offer)} disabled={offerAction === offer.id}>
                  {offerAction === offer.id ? "Cancelling..." : "Cancel offer"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- deal room (detail) ---- */}
      {selectedDealId && (
        detailLoading
          ? <div className="muted" style={{ padding: 40, textAlign: "center" }}>Loading deal…</div>
          : dealDetail
            ? <DealRoom deal={dealDetail} onBack={() => {
                setSelectedDealId(null);
                router.replace("/deals");
              }} onChanged={() => {
                setDetailLoading(true);
                Promise.all([
                  fetch(`/api/escrows/${dealDetail.id}`)
                    .then(r => r.json())
                    .then(json => setDealDetail(json.data || null)),
                  loadEscrows(),
                ])
                  .catch((err) => setError(err instanceof Error ? err.message : "Unable to refresh deal"))
                  .finally(() => setDetailLoading(false));
              }} />
            : <div className="warn-banner">Deal not found.</div>
      )}

      {/* ---- deals list ---- */}
      {!selectedDealId && (
        <div className="card">
          <div className="col" style={{ borderBottom: "1px solid var(--line)" }}>
            <div className="profile-controls">
              <div className="market-tabs" style={{ margin: 0, border: "none", background: "none", padding: 0 }}>
                {VIEWS.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    className={view === v.key ? "active" : ""}
                    onClick={() => { setView(v.key); setStage("all"); }}
                  >
                    {v.label}
                    {v.key === "action" && needsAct.length > 0 && (
                      <span className="market-section-count" style={{ marginLeft: 6 }}>{needsAct.length}</span>
                    )}
                  </button>
                ))}
              </div>
              <input
                className="input profile-search"
                placeholder="Search ID, asset, counterparty…"
                aria-label="Search escrows"
                style={{ height: 32 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="chips profile-stage-chips" style={{ gap: 6, padding: "10px 18px 12px" }}>
              <button className={"chip" + (stage === "all" ? " active" : "")} onClick={() => setStage("all")}>All stages</button>
              {STAGES.map(s => (
                <button key={s} className={"chip" + (stage === s ? " active" : "")} onClick={() => setStage(s)}>{s}</button>
              ))}
            </div>
          </div>

          {filt.length === 0 ? (
            <div className="muted" style={{ padding: 40, textAlign: "center" }}>No deals match this filter.</div>
          ) : (
            <table className="tbl">
              <thead><tr>
                <th>ID · Type</th>
                <th className="hide-mobile">Counterparty</th>
                <th>Asset</th>
                <th className="right">Locked</th>
                <th>Stage</th>
                <th className="hide-mobile">Deadline</th>
                <th>Action</th>
                <th></th>
              </tr></thead>
              <tbody>
                {filt.map(e => (
                  <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => setSelectedDealId(e.id)}>
                    <td>
                      <div className="mono" style={{ color: "var(--ink)" }}>{e.id}</div>
                      <div className="muted-2" style={{ fontSize: 11 }}>{e.kind}</div>
                    </td>
                    <td className="mono hide-mobile">{e.party}</td>
                    <td>{e.asset}</td>
                    <td className="right mono">{fmtUSDC(e.amount)} {e.asset_type}</td>
                    <td><StatusPill s={e.stage} /></td>
                    <td className="muted hide-mobile">{e.deadline}</td>
                    <td>
                      {e.action !== "None" && e.action !== "On schedule" ? (
                        <span className="pill warn" style={{ fontSize: 10 }}>{e.action}</span>
                      ) : (
                        <span className="muted-2" style={{ fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td className="right"><Icon.arrow style={{ color: "var(--ink-3)" }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {profileMessageListing && (
        <ListingMessageModal
          key={`${profileMessageListing.id}-${profileMessageBuyer}`}
          listing={{
            id: profileMessageListing.id,
            title: profileMessageListing.title,
            sellerAddress: profileMessageListing.sellerAddress,
          }}
          initialBuyerAddress={profileMessageBuyer}
          onClose={() => {
            setProfileMessageListing(null);
            setProfileMessageBuyer("");
            refreshListingInbox();
          }}
        />
      )}
      {profileShareListing && (
        <ShareListingModal
          title={profileShareListing.title}
          text={`${profileShareListing.title} — ${fmtUSDC(profileShareListing.price)} ${profileShareListing.currency} on Vault`}
          url={shareUrlForProfileListing(profileShareListing)}
          onClose={() => setProfileShareListing(null)}
          onCopied={() => setListingNotice("Listing link copied.")}
        />
      )}
    </main>
  );
}
