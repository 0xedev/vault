"use client";

import React, { useState } from "react";
import Icon from "@/components/icons";
import { useWallet } from "@/components/WalletProvider";
import {
  getEscrowAddress,
  writeListDeal,
  waitForDealId,
  hashMetadata,
  verificationCode,
  parseContractError,
} from "@/lib/contract";
import { parseEther, type Address } from "viem";

const X_DELIVERABLE_OPTIONS = [
  { key: "oauth", label: "OAuth token access" },
  { key: "twofa", label: "2FA codes & backup keys" },
  { key: "email", label: "Email address change" },
  { key: "phone", label: "Phone number transfer" },
  { key: "apps", label: "Connected apps list" },
  { key: "recovery", label: "Account recovery codes" },
  { key: "data", label: "Archive download (posts, DMs)" },
  { key: "domain", label: "Custom domain handoff" },
] as const;

export default function ListXModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deliverables, setDeliverables] = useState<Record<string, boolean>>({});
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const toggleDeliverable = (key: string) =>
    setDeliverables((p) => ({ ...p, [key]: !p[key] }));

  const [tweetUrl, setTweetUrl] = useState("");

  const checkVerification = async (tweetUrl: string) => {
    if (!tweetUrl || !handle) return;
    setVerifying(true);
    try {
      const res = await fetch(
        `/api/verify?type=x&handle=${encodeURIComponent(handle)}&tweetUrl=${encodeURIComponent(tweetUrl)}&code=${verifyCode}`,
      );
      const json = await res.json();
      if (json.verified) setVerified(true);
      else
        setError(
          `Not verified yet: ${json.reason || "Tweet not found or author mismatch."}`,
        );
    } catch {
      setError("Verification check failed. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  const submitListing = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const normalized = handle.startsWith("@") ? handle : `@${handle}`;
      const selectedDeliverables = X_DELIVERABLE_OPTIONS.filter(
        (d) => deliverables[d.key],
      ).map((d) => d.label);
      const metadata = {
        handle: normalized,
        followers: Number(followers || 0),
        price: Number(price),
        image: imageUrl,
        description,
        deliverables: selectedDeliverables,
        kind: "X Account",
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);
      const txHash = await writeListDeal(
        address as Address,
        parseEther(price || "0"),
        metaHash,
      );
      const contractListingId = await waitForDealId(txHash);
      const res = await fetch("/api/marketplace/x-accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address,
          title: normalized,
          price: Number(price),
          description,
          chainId: 8453,
          contractAddress: getEscrowAddress(),
          contractListingId,
          txHash,
          data: {
            handle: normalized,
            followers: Number(followers || 0),
            imageUrl,
            niche: "Pending review",
            age: "Unverified",
            engagement: 0,
            posts_30d: 0,
            growth: "0%",
            verified: false,
            includes: selectedDeliverables,
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit X listing");
      setVerifyCode(verificationCode(metaHash));
      setVerified(false);
      setHandle("");
      setFollowers("");
      setPrice("");
      setImageUrl("");
      setDeliverables({});
      setDescription("");
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
        style={{ maxWidth: 520 }}
      >
        <div className="modal-h">
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>
            List X account
          </h3>
          <button className="btn ghost sm" onClick={onClose}>
            <Icon.x />
          </button>
        </div>
        <div
          className="modal-b col"
          style={{ gap: 14, maxHeight: "70vh", overflowY: "auto" }}
        >
          {/* Simplified inputs */}
          <div>
            <span className="label">Handle</span>
            <input
              className="input"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@handle"
            />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div>
              <span className="label">Followers</span>
              <input
                className="input mono"
                type="number"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
              />
            </div>
            <div>
              <span className="label">Price (Ξ)</span>
              <input
                className="input mono"
                type="number"
                step="0.1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="label">Profile image URL</span>
            <input
              className="input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="label">Description</span>
            <textarea
              className="input"
              style={{
                minHeight: 50,
                resize: "vertical",
                padding: "10px 12px",
              }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What comes with this handle?"
            />
          </div>
          {error && (
            <div className="warn-banner" style={{ color: "var(--risk)" }}>
              {error}
            </div>
          )}
          <div className="col" style={{ gap: 6 }}>
            <span className="label">
              Deliverables ({Object.values(deliverables).filter(Boolean).length}{" "}
              selected)
            </span>
            <div className="grid grid-2" style={{ gap: 6 }}>
              {X_DELIVERABLE_OPTIONS.map((d) => (
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

          {verifyCode && !verified && (
            <div
              className="card"
              style={{
                padding: 14,
                background: "rgba(127,157,197,0.08)",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  Prove ownership — post this tweet:
                </div>
                <code
                  className="mono"
                  style={{
                    background: "var(--surface-2)",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Verifying {handle?.replace("@", "")} ownership for Vault:{" "}
                  {verifyCode}
                </code>
                <span className="label">Paste tweet URL</span>
                <input
                  className="input"
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                  placeholder="https://x.com/.../status/..."
                  style={{ marginTop: 4 }}
                />
              </div>
              <button
                className="btn sm primary"
                onClick={() => checkVerification(tweetUrl)}
                disabled={verifying || !tweetUrl}
              >
                {verifying ? "Checking…" : "Check verification"}
              </button>
            </div>
          )}
          <div className="modal-f">
            <button className="btn" onClick={onClose}>
              Close
            </button>
            <button
              className="btn primary"
              disabled={submitting || !handle || !price}
              onClick={submitListing}
            >
              {submitting ? "Signing & listing…" : "Submit for review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
