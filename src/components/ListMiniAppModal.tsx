"use client";

import React, { useState } from "react";
import Icon from "@/components/icons";
import { useWallet } from "@/components/WalletProvider";
import {
  getEscrowAddress,
  writeListMiniApp,
  waitForDealId,
  hashMetadata,
  parseContractError,
} from "@/lib/contract";
import { parseUnits, type Address } from "viem";
const DELIVERABLE_OPTIONS = [
  { key: "source", label: "Source code repo" },
  { key: "domain", label: "Domain & DNS" },
  { key: "social", label: "Social handles (X / Farcaster / TG)" },
  { key: "contract", label: "Smart contract owner role" },
  { key: "keys", label: "API keys & env vars" },
  { key: "db", label: "Database / hosting" },
  { key: "docs", label: "Documentation & onboarding" },
  { key: "revenue", label: "Revenue streams (tx fees, subs)" },
] as const;

type Props = { onClose: () => void };

export default function ListMiniAppModal({ onClose }: Props) {
  const { address } = useWallet();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState<Record<string, boolean>>({});
  const [dau, setDau] = useState("");
  const [mrr, setMrr] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fetchingOg, setFetchingOg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const toggleDeliverable = (key: string) =>
    setDeliverables((p) => ({ ...p, [key]: !p[key] }));

  const fetchOgPreview = async (liveUrl: string) => {
    if (!liveUrl || !/^https?:\/\//i.test(liveUrl)) return;
    setFetchingOg(true);
    try {
      const res = await fetch(
        `/api/og-preview?url=${encodeURIComponent(liveUrl)}`,
      );
      const json = await res.json();
      if (json.image) setImageUrl(json.image);
      if (json.title && !name) setName(json.title);
      if (json.description && !description) setDescription(json.description);
    } catch {
      // silent
    } finally {
      setFetchingOg(false);
    }
  };

  const handleSubmit = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const selectedDeliverables = DELIVERABLE_OPTIONS.filter(
        (d) => deliverables[d.key],
      ).map((d) => d.label);
      const metadata = {
        name,
        description,
        url,
        repo,
        image: imageUrl,
        deliverables: selectedDeliverables,
        dau: Number(dau || 0),
        mrr: Number(mrr || 0),
        price: Number(price),
        stack: repo.includes("github")
          ? ["GitHub", "Source available"]
          : ["Source pending"],
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);
      const priceWei = parseUnits(price || "0", 6);
      const txHash = await writeListMiniApp(
        address as Address,
        priceWei,
        metaHash,
      );
      const contractListingId = await waitForDealId(txHash);
      const res = await fetch("/api/marketplace/mini-apps", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address,
          title: name,
          description,
          price: Number(price),
          chainId: 8453,
          contractAddress: getEscrowAddress(),
          contractListingId,
          txHash,
          data: {
            name,
            kind: "Mini App",
            dau: Number(dau || 0),
            mrr: Number(mrr || 0),
            imageUrl,
            stack: metadata.stack,
            source: Boolean(repo),
            age: "New",
            url,
            repo,
            includes: selectedDeliverables,
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit listing");
      setDone(
        "Listed on-chain. Buyers can fund escrow and confirm terms directly with the seller.",
      );
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560 }}
      >
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>
            List Mini App
          </h3>
          <button className="btn ghost sm" onClick={onClose}>
            <Icon.x />
          </button>
        </div>
        <div
          className="modal-b"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <div className="col" style={{ gap: 4 }}>
            <span className="label">Project Name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. On-Chain Poker"
            />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div>
              <span className="label">Live URL</span>
              <input
                className="input"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  fetchOgPreview(e.target.value);
                }}
                placeholder="https://example.com"
              />
              {fetchingOg && (
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Fetching preview…
                </div>
              )}
            </div>
            <div>
              <span className="label">Repo URL</span>
              <input
                className="input"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="https://github.com/owner/repo"
              />
            </div>
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div>
              <span className="label">DAU</span>
              <input
                className="input mono"
                value={dau}
                onChange={(e) => setDau(e.target.value)}
                placeholder="1234"
              />
            </div>
            <div>
              <span className="label">MRR (USDC)</span>
              <input
                className="input mono"
                value={mrr}
                onChange={(e) => setMrr(e.target.value)}
                placeholder="0.5"
              />
            </div>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="label">Asking price (USDC)</span>
            <input
              className="input mono"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="5.0"
            />
          </div>

          <div className="col" style={{ gap: 6 }}>
            <span className="label">
              Deliverables ({Object.values(deliverables).filter(Boolean).length}{" "}
              selected)
            </span>
            <div className="grid grid-2" style={{ gap: 6 }}>
              {DELIVERABLE_OPTIONS.map((d) => (
                <label
                  key={d.key}
                  style={{
                    padding: "8px 10px",
                    border: deliverables[d.key]
                      ? "1px solid var(--accent)"
                      : "1px solid var(--line)",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: deliverables[d.key]
                      ? "rgba(127,157,197,0.08)"
                      : "transparent",
                    fontSize: 12.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!deliverables[d.key]}
                    onChange={() => toggleDeliverable(d.key)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          {error && (
            <div className="warn-banner" style={{ color: "var(--risk)" }}>
              {error}
            </div>
          )}

          {done && (
            <div
              className="card"
              style={{
                padding: 14,
                background: "rgba(127,157,197,0.08)",
                border: "1px solid var(--line)",
              }}
            >
              <div
                className="pill funded"
                style={{ width: "fit-content", marginBottom: 10 }}
              >
                <span className="pdot" />
                {done}
              </div>
            </div>
          )}

          <div className="modal-f">
            <button className="btn" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn primary lg"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={submitting || !name || !price || !url}
            >
              {submitting ? "Signing & listing…" : "List Mini App"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
