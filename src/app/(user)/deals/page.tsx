"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
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
} from "@/lib/contract";
import {
  claimClankerVaultedTokens,
  transferClankerRewardAdmins,
  transferClankerRewardRecipients,
  transferClankerTokenAdmin,
  transferClankerTokenSupply,
} from "@/lib/clanker-writes";
import { fmtETH, fmtUSD } from "@/lib/utils";
import { selectedRights } from "@/lib/clanker";
import { type Address, type Hash } from "viem";
import { shareAsCast } from "@/lib/farcaster-sdk";

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
  verified: boolean;
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
  const { address } = useWallet();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const chatRef = useRef<HTMLDivElement>(null);
  const step = stageToStep(deal.stageRaw);
  const walletAddress = address?.toLowerCase();
  const buyerAddress = deal.buyerAddress.toLowerCase();
  const sellerAddress = deal.sellerAddress.toLowerCase();
  const actorRole = walletAddress === sellerAddress ? "seller" : walletAddress === buyerAddress ? "buyer" : role;
  const isContractBacked = Boolean(deal.contractListingId);
  const isClankerDeal = Boolean(deal.clankerTransfer?.tokenAddress);

  const markAsRead = async (ids: string[]) => {
    const unread = ids.filter(id => !seenRef.current.has(id));
    if (unread.length === 0) return;
    unread.forEach(id => seenRef.current.add(id));
    fetch(`/api/deals/${deal.id}/messages/read`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: unread }),
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
    const query = address ? `?walletAddress=${encodeURIComponent(address)}` : "";
    fetch(`/api/deals/${deal.id}/messages${query}`)
      .then(r => r.json())
      .then(json => {
        setMessages(json.data || []);
        setHasMore(json.hasMore);
      })
      .catch(() => {});
  }, [address, deal.id]);

  const loadMore = async () => {
    if (loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const cursor = messages[0].createdAt;
    const query = address ? `?walletAddress=${encodeURIComponent(address)}&cursor=${encodeURIComponent(cursor)}` : `?cursor=${encodeURIComponent(cursor)}`;
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
        body: JSON.stringify({ ...body, actorAddress: address, ...(txHash ? { txHash } : {}) }),
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
        actorAddress: address,
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
        body: JSON.stringify({ actorAddress: address, body }),
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
      const uploadRes = await fetch(`/api/deals/${deal.id}/messages/image`, {
        method: "POST", credentials: "include", body: form,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || "Upload failed");

      const res = await fetch(`/api/deals/${deal.id}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorAddress: address,
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
              <span className="pill gold">{deal.bundleAssets.length > 0 ? <><Icon.shield style={{ width: 12, height: 12, marginRight: 4 }} />{deal.bundleAssets.length} assets</> : deal.verified ? <><span className="pdot" />Verified seller</> : "Pending verification"}</span>
            </div>
            <div className="grid grid-3" style={{ marginTop: 12 }}>
              <div className="metric"><span className="lab">Amount</span><span className="val">{deal.price} {deal.currency}</span><span className="delta">≈ {fmtUSD(deal.price * 3450)}</span></div>
              <div className="metric"><span className="lab">Monthly fees</span><span className="val">{deal.mrr} {deal.currency}</span><span className="delta">last 30d, on-chain verified</span></div>
              <div className="metric"><span className="lab">Chain</span><span className="val" style={{ fontSize: 16 }}>{deal.chain}</span><span className="delta">contract verified</span></div>
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
            <div ref={chatRef} className="col" style={{ flex: 1, overflowY: "auto", gap: 4, padding: "4px 0" }}>
              {hasMore && (
                <button className="btn ghost sm" onClick={loadMore} disabled={loadingMore} style={{ marginBottom: 4, fontSize: 11 }}>
                  {loadingMore ? "Loading..." : "Load earlier messages"}
                </button>
              )}
              {messages.map((m) => (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.me ? "flex-end" : "flex-start" }}>
                  <div className={"bubble" + (m.me ? " me" : "")}>
                    <div className="who">
                      {m.sender} · {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {m.readAt && m.me && <span className="read-receipt"> ✓✓</span>}
                    </div>
                    {m.messageType === "image" && m.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={m.imageUrl} alt="attachment" style={{ maxWidth: 200, borderRadius: 8, marginTop: 2 }} />
                    ) : (
                      m.body
                    )}
                  </div>
                </div>
              ))}
              {messages.length === 0 && <div className="muted" style={{ padding: 20, textAlign: "center", fontSize: 12 }}>No messages yet. Start the conversation.</div>}
            </div>
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
              <input className="input" placeholder="Send a message…" aria-label="Send a message" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} />
              <button className="btn primary" onClick={() => sendMsg()} disabled={sending}><Icon.send /></button>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Funds in escrow</div>
            <div className="kv"><span className="k">Buyer deposit</span><span className="v">{deal.price} {deal.currency}</span></div>
            <div className="kv"><span className="k">Platform fee (2.5%)</span><span className="v">{(deal.price * 0.025).toFixed(2)} {deal.currency}</span></div>
            <div className="kv"><span className="k">Net to seller</span><span className="v" style={{ color: "var(--accent)" }}>{(deal.price * 0.975).toFixed(2)} {deal.currency}</span></div>
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
              Funds release is permanent. Only release after verifying all deliverables.
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

export default function DealsPage() {
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("active");
  const [stage, setStage] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [dealDetail, setDealDetail] = useState<DealDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { isConnected, isConnecting, connect, role, address } = useWallet();

  const loadEscrows = React.useCallback(() => {
    const query = address ? `?walletAddress=${encodeURIComponent(address)}` : "";
    return fetch(`/api/escrows${query}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load deals");
        return json;
      })
      .then((json) => { setEscrows(json.data || []); setLoading(false); });
  }, [address]);

  useEffect(() => {
    if (!isConnected || !role) { queueMicrotask(() => { setLoading(false); setError("Authentication required"); }); return; }
    queueMicrotask(() => { setLoading(true); setError(""); });
    loadEscrows()
      .catch((err) => { setError(err instanceof Error ? err.message : "Unable to load deals"); setLoading(false); });
  }, [isConnected, role, loadEscrows]);

  useEffect(() => {
    if (!selectedDealId) { queueMicrotask(() => setDealDetail(null)); return; }
    queueMicrotask(() => setDetailLoading(true));
    const query = address ? `?walletAddress=${encodeURIComponent(address)}` : "";
    fetch(`/api/escrows/${selectedDealId}${query}`)
      .then(r => r.json())
      .then(json => { setDealDetail(json.data || null); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  }, [address, selectedDealId]);

  /* -- computed -- */
  const active     = escrows.filter(e => e.stage !== "Released" && e.stage !== "Refunded");
  const needsAct   = escrows.filter(e => e.action !== "On schedule" && e.action !== "None");
  const totalLocked = active.reduce((s, e) => s + e.amount, 0);
  const completed   = escrows.filter(e => e.stage === "Released").length;

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

  /* -- export -- */
  const exportCsv = () => {
    const csv = "id,kind,party,asset,amount,stage,deadline\n" +
      filt.map(e => `${e.id},${e.kind},${e.party},${e.asset},${e.amount},${e.stage},${e.deadline}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "deals.csv";
    a.click();
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
          <h1 className="h2" style={{ marginTop: 8 }}>
            {fmtETH(totalLocked)} Ξ locked · {active.length} active
          </h1>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={exportCsv}>Export CSV</button>
          <Link href="/market" className="btn primary">New deal</Link>
        </div>
      </div>

      {/* ---- metrics ---- */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="metric">
          <span className="lab">Funds locked</span>
          <span className="val">{fmtETH(totalLocked)} Ξ</span>
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
          <span className="lab">Est. fees paid</span>
          <span className="val">{fmtETH(totalLocked * 0.015)} Ξ</span>
          <span className="delta">1.5% origination</span>
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

      {/* ---- deal room (detail) ---- */}
      {selectedDealId && (
        detailLoading
          ? <div className="muted" style={{ padding: 40, textAlign: "center" }}>Loading deal…</div>
          : dealDetail
            ? <DealRoom deal={dealDetail} onBack={() => setSelectedDealId(null)} onChanged={() => {
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
                    <td className="right mono">{fmtETH(e.amount)} {e.asset_type}</td>
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
    </main>
  );
}
