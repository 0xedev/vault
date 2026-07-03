"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/icons";
import { useWallet } from "@/components/WalletProvider";
import { currentActorAddress } from "@/lib/identity";
import { fmtUSDC } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type InboxMode = "predeal" | "deal";

type ListingInboxThread = {
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
};

type ListingMessage = {
  id: string;
  senderName?: string;
  senderAddress: string;
  body: string;
  createdAt: string;
  me: boolean;
};

type DealThread = {
  id: string;
  kind: string;
  party: string;
  asset: string;
  amount: number;
  asset_type: string;
  deadline: string;
  stage: string;
  action: string;
};

type DealMessage = {
  id: string;
  sender: string;
  senderAddress?: string;
  body: string;
  createdAt: string;
  me: boolean;
  readAt?: string | null;
  messageType?: string;
  imageUrl?: string | null;
};

type ActiveThread =
  | { type: "predeal"; thread: ListingInboxThread }
  | { type: "deal"; thread: DealThread };

function shortAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function marketplaceLabel(value: string) {
  return value ? value.replace(/_/g, " ") : "Listing";
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ThreadEmptyState({ mode }: { mode: InboxMode }) {
  return (
    <div className="messages-empty" role="status">
      <Icon.send />
      <h3>{mode === "predeal" ? "No pre-deal messages" : "No deal chats"}</h3>
      <p>
        {mode === "predeal"
          ? "Questions from buyers and sellers before escrow opens will land here."
          : "Active escrow conversations appear here with a shortcut back to each deal."}
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: ListingMessage | DealMessage }) {
  const sender = "sender" in message
    ? message.sender || shortAddress(message.senderAddress)
    : message.senderName || shortAddress(message.senderAddress);

  return (
    <div className={"messages-bubble" + (message.me ? " me" : "")}>
      <div className="messages-bubble-meta">
        {message.me ? "You" : sender} · {timeLabel(message.createdAt)}
      </div>
      {"imageUrl" in message && message.messageType === "image" && message.imageUrl ? (
        <a href={message.imageUrl} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={message.imageUrl} alt={message.body || "Message attachment"} />
        </a>
      ) : null}
      <div className="messages-bubble-body">{message.body}</div>
    </div>
  );
}

function Composer({
  placeholder,
  sending,
  disabled,
  onSend,
}: {
  placeholder: string;
  sending: boolean;
  disabled?: boolean;
  onSend: (body: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");

  const send = async () => {
    const body = draft.trim();
    if (!body || sending || disabled) return;
    await onSend(body);
    setDraft("");
  };

  return (
    <div className="messages-composer">
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label="Message body"
        disabled={disabled || sending}
        className="messages-composer-input"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
      />
      <Button onClick={send} disabled={!draft.trim() || sending || disabled}>
        <Icon.send /> {sending ? "Sending" : "Send"}
      </Button>
    </div>
  );
}

function ThreadList({
  mode,
  listingThreads,
  dealThreads,
  selected,
  onSelect,
}: {
  mode: InboxMode;
  listingThreads: ListingInboxThread[];
  dealThreads: DealThread[];
  selected: ActiveThread | null;
  onSelect: (thread: ActiveThread) => void;
}) {
  if (mode === "predeal" && listingThreads.length === 0) return <ThreadEmptyState mode={mode} />;
  if (mode === "deal" && dealThreads.length === 0) return <ThreadEmptyState mode={mode} />;

  return (
    <div className="messages-thread-list" role="list">
      {mode === "predeal" ? listingThreads.map((thread) => {
        const active = selected?.type === "predeal" && selected.thread.listingId === thread.listingId && selected.thread.buyerAddress === thread.buyerAddress;
        return (
          <button
            key={`${thread.listingId}-${thread.buyerAddress}`}
            type="button"
            className={"messages-thread" + (active ? " active" : "")}
            onClick={() => onSelect({ type: "predeal", thread })}
          >
            <span className="messages-thread-kicker">{thread.role === "seller" ? "Buyer thread" : "Seller thread"}</span>
            <strong>{thread.listingTitle}</strong>
            <span>{thread.counterpartyName} · {thread.lastSenderName}: {thread.preview}</span>
            <small>{marketplaceLabel(thread.marketplace)} · {timeLabel(thread.createdAt)}</small>
            {thread.unreadCount > 0 && <Badge className="messages-thread-badge">{thread.unreadCount} new</Badge>}
          </button>
        );
      }) : dealThreads.map((thread) => {
        const active = selected?.type === "deal" && selected.thread.id === thread.id;
        return (
          <button
            key={thread.id}
            type="button"
            className={"messages-thread" + (active ? " active" : "")}
            onClick={() => onSelect({ type: "deal", thread })}
          >
            <span className="messages-thread-kicker">{thread.kind}</span>
            <strong>{thread.asset}</strong>
            <span>{thread.party} · {thread.action}</span>
            <small>{fmtUSDC(thread.amount)} {thread.asset_type} · {thread.stage}</small>
          </button>
        );
      })}
    </div>
  );
}

function ChatPanel({
  activeThread,
  actorAddress,
  onListingRead,
}: {
  activeThread: ActiveThread | null;
  actorAddress: string;
  onListingRead: () => void;
}) {
  const [listingMessages, setListingMessages] = useState<ListingMessage[]>([]);
  const [dealMessages, setDealMessages] = useState<DealMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeThread || !actorAddress) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      setLoading(true);
      setError("");
    });

    if (activeThread.type === "predeal") {
      const query = new URLSearchParams({ walletAddress: actorAddress });
      if (activeThread.thread.role === "seller") query.set("buyerAddress", activeThread.thread.buyerAddress);
      fetch(`/api/listings/${encodeURIComponent(activeThread.thread.listingId)}/messages?${query.toString()}`, {
        credentials: "include",
        signal: controller.signal,
      })
        .then(async (res) => {
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || "Unable to load messages");
          setListingMessages(json.data || []);
          setDealMessages([]);
          onListingRead();
        })
        .catch((err) => {
          if (err.name !== "AbortError") setError(err instanceof Error ? err.message : "Unable to load messages");
        })
        .finally(() => queueMicrotask(() => setLoading(false)));
      return () => controller.abort();
    }

    const query = new URLSearchParams({ walletAddress: actorAddress });
    fetch(`/api/deals/${encodeURIComponent(activeThread.thread.id)}/messages?${query.toString()}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Unable to load deal messages");
        const messages: DealMessage[] = json.data || [];
        setDealMessages(messages);
        setListingMessages([]);
        const unread = messages.filter((message) => !message.me && !message.readAt).map((message) => message.id);
        if (unread.length > 0) {
          fetch(`/api/deals/${encodeURIComponent(activeThread.thread.id)}/messages/read`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageIds: unread, actorAddress }),
          }).catch(() => {});
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err instanceof Error ? err.message : "Unable to load deal messages");
      })
      .finally(() => queueMicrotask(() => setLoading(false)));

    return () => controller.abort();
  }, [activeThread, actorAddress, onListingRead]);

  const sendListingMessage = async (body: string) => {
    if (!activeThread || activeThread.type !== "predeal") return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(activeThread.thread.listingId)}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorAddress,
          body,
          ...(activeThread.thread.role === "seller" ? { buyerAddress: activeThread.thread.buyerAddress } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to send message");
      setListingMessages((prev) => [...prev, json.data]);
      onListingRead();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  const sendDealMessage = async (body: string) => {
    if (!activeThread || activeThread.type !== "deal") return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(activeThread.thread.id)}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorAddress, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to send message");
      setDealMessages((prev) => [...prev, json.data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  if (!activeThread) {
    return (
      <Card className="messages-chat-card messages-chat-empty-card">
        <div className="messages-empty" role="status">
          <Icon.send />
          <h3>Select a conversation</h3>
          <p>Choose a pre-deal or deal thread to read and reply inline.</p>
        </div>
      </Card>
    );
  }

  const messages = activeThread.type === "predeal" ? listingMessages : dealMessages;
  const title = activeThread.type === "predeal" ? activeThread.thread.listingTitle : activeThread.thread.asset;
  const subtitle = activeThread.type === "predeal"
    ? `${activeThread.thread.counterpartyName} · ${marketplaceLabel(activeThread.thread.marketplace)}`
    : `${activeThread.thread.kind} · ${activeThread.thread.stage}`;

  return (
    <Card className="messages-chat-card">
      <CardHeader className="messages-chat-head">
        <div>
          <div className="eyebrow">{activeThread.type === "predeal" ? "Pre-deal chat" : "Deal chat"}</div>
          <CardTitle>{title}</CardTitle>
          <p className="muted">{subtitle}</p>
        </div>
        {activeThread.type === "deal" && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/deals?id=${encodeURIComponent(activeThread.thread.id)}`}>
              View deal <Icon.arrow />
            </Link>
          </Button>
        )}
      </CardHeader>
      <Separator />
      <CardContent className="messages-chat-content">
        {error && <div className="warn-banner messages-chat-error">{error}</div>}
        <ScrollArea className="messages-scroll" aria-live="polite">
          {loading ? (
            <div className="muted messages-loading">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="messages-empty compact" role="status">
              <Icon.send />
              <h3>No messages yet</h3>
              <p>Start the thread with a short, specific note.</p>
            </div>
          ) : (
            <div className="messages-stack">
              {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            </div>
          )}
        </ScrollArea>
        <Composer
          placeholder={activeThread.type === "predeal" ? "Reply about this listing..." : "Reply in this deal room..."}
          sending={sending}
          disabled={loading}
          onSend={activeThread.type === "predeal" ? sendListingMessage : sendDealMessage}
        />
      </CardContent>
    </Card>
  );
}

export default function MessagesPage() {
  const { address, sessionAddress, isConnected, isConnecting, connect } = useWallet();
  const actorAddress = useMemo(() => currentActorAddress({ address, sessionAddress }), [address, sessionAddress]);
  const [mode, setMode] = useState<InboxMode>("predeal");
  const [listingThreads, setListingThreads] = useState<ListingInboxThread[]>([]);
  const [dealThreads, setDealThreads] = useState<DealThread[]>([]);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const activeThreadRef = useRef<ActiveThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInbox = React.useCallback(() => {
    if (!actorAddress) {
      setLoading(false);
      return Promise.resolve();
    }

    setLoading(true);
    setError("");
    return Promise.all([
      fetch(`/api/listings/messages?walletAddress=${encodeURIComponent(actorAddress)}`, { credentials: "include" }).then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Unable to load listing messages");
        return json.data || [];
      }),
      fetch(`/api/escrows?walletAddress=${encodeURIComponent(actorAddress)}`, { credentials: "include" }).then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Unable to load deal messages");
        return json.data || [];
      }),
    ])
      .then(([listingData, dealData]) => {
        setListingThreads(listingData);
        setDealThreads(dealData);
        const nextThread = (() => {
          const current = activeThreadRef.current;
          if (current?.type === "predeal") {
            const next = listingData.find((thread: ListingInboxThread) => thread.listingId === current.thread.listingId && thread.buyerAddress === current.thread.buyerAddress);
            return next ? { type: "predeal", thread: next } : null;
          }
          if (current?.type === "deal") {
            const next = dealData.find((thread: DealThread) => thread.id === current.thread.id);
            return next ? { type: "deal", thread: next } : null;
          }
          return listingData[0]
            ? { type: "predeal", thread: listingData[0] }
            : dealData[0]
              ? { type: "deal", thread: dealData[0] }
              : null;
        })() as ActiveThread | null;
        activeThreadRef.current = nextThread;
        setActiveThread(nextThread);
        if (nextThread) setMode(nextThread.type === "predeal" ? "predeal" : "deal");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load messages"))
      .finally(() => setLoading(false));
  }, [actorAddress]);

  useEffect(() => {
    if (!isConnected) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    queueMicrotask(() => { loadInbox(); });
  }, [isConnected, loadInbox]);

  const selectThread = (thread: ActiveThread) => {
    activeThreadRef.current = thread;
    setActiveThread(thread);
    setMode(thread.type === "predeal" ? "predeal" : "deal");
  };

  const markListingThreadRead = React.useCallback(() => {
    if (!activeThread || activeThread.type !== "predeal") return;
    setListingThreads((prev) => prev.map((thread) =>
      thread.listingId === activeThread.thread.listingId && thread.buyerAddress === activeThread.thread.buyerAddress
        ? { ...thread, unreadCount: 0 }
        : thread
    ));
  }, [activeThread]);

  if (!isConnected || !actorAddress) {
    return (
      <main id="main-content" role="main" aria-label="Messages" className="main">
        <Card className="messages-auth-card">
          <CardHeader>
            <div className="eyebrow">Messages</div>
            <CardTitle>Connect to view your inbox</CardTitle>
          </CardHeader>
          <CardContent className="col" style={{ gap: 14 }}>
            <p className="muted">Your pre-deal questions and escrow chats are private to your signed-in wallet.</p>
            <Button onClick={connect} disabled={isConnecting}>{isConnecting ? "Connecting..." : "Connect wallet"}</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main id="main-content" role="main" aria-label="Messages" className="main messages-page">
      <div className="row between messages-page-head">
        <div>
          <div className="eyebrow">Messages</div>
          <h1 className="h2" style={{ marginTop: 8 }}>Inbox</h1>
          <p className="muted">Pre-deal questions and active deal conversations in one place.</p>
        </div>
        <Button variant="outline" onClick={() => loadInbox()} disabled={loading}>
          <Icon.clock /> Refresh
        </Button>
      </div>

      {error && <div className="warn-banner" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="messages-shell">
        <Card className="messages-inbox-card">
          <CardHeader className="messages-inbox-head">
            <div>
              <CardTitle>Threads</CardTitle>
              <p className="muted">Signed in as {shortAddress(actorAddress)}</p>
            </div>
            <Tabs value={mode} onValueChange={(value) => setMode(value as InboxMode)}>
              <TabsList>
                <TabsTrigger value="predeal">Pre-deal</TabsTrigger>
                <TabsTrigger value="deal">Deals</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <Separator />
          <CardContent className="messages-inbox-content">
            {loading ? (
              <div className="muted messages-loading">Loading threads...</div>
            ) : (
              <ThreadList
                mode={mode}
                listingThreads={listingThreads}
                dealThreads={dealThreads}
                selected={activeThread}
                onSelect={selectThread}
              />
            )}
          </CardContent>
        </Card>

        <ChatPanel activeThread={activeThread} actorAddress={actorAddress} onListingRead={markListingThreadRead} />
      </div>
    </main>
  );
}
