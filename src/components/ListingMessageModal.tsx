"use client";

import React, { useEffect, useMemo, useState } from "react";
import Icon from "@/components/icons";
import { useWallet } from "@/components/WalletProvider";

type ListingMessage = {
  id: string;
  buyerAddress: string;
  sellerAddress: string;
  sender: string;
  senderName?: string;
  senderAddress: string;
  body: string;
  createdAt: string;
  me: boolean;
};

type ListingThread = {
  buyerAddress: string;
  buyer: string;
  preview: string;
  createdAt: string;
  unreadCount?: number;
};

type Props = {
  listing: {
    id: string;
    title: string;
    sellerAddress?: string;
  };
  onClose: () => void;
  initialBuyerAddress?: string;
};

function shortAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ListingMessageModal({ listing, onClose, initialBuyerAddress = "" }: Props) {
  const { address, sessionAddress, isConnected, isConnecting, connect } = useWallet();
  const [messages, setMessages] = useState<ListingMessage[]>([]);
  const [threads, setThreads] = useState<ListingThread[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState(initialBuyerAddress);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const isSeller = useMemo(
    () => Boolean(address && listing.sellerAddress && address.toLowerCase() === listing.sellerAddress.toLowerCase()),
    [address, listing.sellerAddress],
  );
  const hasSessionForWallet = useMemo(
    () => Boolean(
      address &&
      sessionAddress &&
      (!sessionAddress.startsWith("0x") || sessionAddress.toLowerCase() === address.toLowerCase()),
    ),
    [address, sessionAddress],
  );

  const loadMessages = React.useCallback((buyerAddress?: string) => {
    if (!address) return;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ walletAddress: address });
    if (buyerAddress) query.set("buyerAddress", buyerAddress);
    fetch(`/api/listings/${encodeURIComponent(listing.id)}/messages?${query.toString()}`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Unable to load messages");
        setMessages(json.data || []);
        setThreads(json.threads || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load messages"))
      .finally(() => setLoading(false));
  }, [address, listing.id]);

  useEffect(() => {
    if (!isConnected || !address) return;
    queueMicrotask(() => loadMessages(isSeller ? selectedBuyer || undefined : undefined));
  }, [address, isConnected, isSeller, loadMessages, selectedBuyer]);

  const sendMessage = async () => {
    if (!address || !draft.trim()) return;
    if (!hasSessionForWallet) {
      await connect();
      return;
    }
    if (isSeller && !selectedBuyer) {
      setError("Select a buyer thread before replying.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(listing.id)}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorAddress: address,
          body: draft,
          ...(isSeller ? { buyerAddress: selectedBuyer } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to send message");
      setMessages((prev) => [...prev, json.data]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal listing-message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="modal-h">
          <div>
            <div className="eyebrow">{isSeller ? "Buyer messages" : "Message seller"}</div>
            <h3 className="serif" style={{ margin: "4px 0 0", fontSize: 20 }}>{listing.title}</h3>
          </div>
          <button className="btn ghost sm" onClick={onClose}><Icon.x /></button>
        </div>

        {!isConnected ? (
          <div className="modal-b col" style={{ gap: 14 }}>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Connect your wallet to start a private pre-deal conversation.</p>
            <button className="btn primary" onClick={connect} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect wallet"}
            </button>
          </div>
        ) : !hasSessionForWallet ? (
          <div className="modal-b col" style={{ gap: 14 }}>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Sign in with your connected wallet to start a private pre-deal conversation.</p>
            <button className="btn primary" onClick={connect} disabled={isConnecting}>
              {isConnecting ? "Signing in..." : "Sign in"}
            </button>
          </div>
        ) : (
          <>
            <div className="modal-b listing-message-body">
              {isSeller && !selectedBuyer && (
                <div className="listing-thread-list">
                  {threads.length === 0 ? (
                    <div className="muted" style={{ padding: 24, textAlign: "center" }}>No buyer messages yet.</div>
                  ) : threads.map((thread) => (
                    <button key={thread.buyerAddress} type="button" onClick={() => setSelectedBuyer(thread.buyerAddress)}>
                      <strong>{thread.buyer}{thread.unreadCount ? ` (${thread.unreadCount})` : ""}</strong>
                      <span>{thread.preview}</span>
                      <small>{new Date(thread.createdAt).toLocaleString()}</small>
                    </button>
                  ))}
                </div>
              )}

              {(!isSeller || selectedBuyer) && (
                <>
                  {isSeller && (
                    <button className="btn ghost sm" onClick={() => { setSelectedBuyer(""); setMessages([]); }} style={{ marginBottom: 10 }}>
                      Back to buyers
                    </button>
                  )}
                  <div className="listing-message-scroll">
                    {loading ? (
                      <div className="muted" style={{ padding: 24, textAlign: "center" }}>Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="muted" style={{ padding: 24, textAlign: "center" }}>
                        No messages yet. Say hello and ask any pre-deal questions.
                      </div>
                    ) : messages.map((message) => (
                      <div key={message.id} className={"listing-message" + (message.me ? " me" : "")}>
                        <small>{message.me ? "You" : message.senderName || shortAddress(message.senderAddress)} · {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                        <span>{message.body}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {error && <div className="warn-banner" style={{ marginTop: 10, color: "var(--risk)", fontSize: 12 }}>{error}</div>}
            </div>

            {(!isSeller || selectedBuyer) && (
              <div className="modal-f">
                <textarea
                  className="input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={isSeller ? "Reply to buyer..." : "Ask the seller a question..."}
                  style={{ minHeight: 42, height: 42, resize: "vertical", padding: "10px 12px", flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button className="btn primary" onClick={sendMessage} disabled={sending || !draft.trim()}>
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
