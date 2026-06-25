"use client";

import React, { useState } from "react";
import Icon from "@/components/icons";
import { useWallet } from "@/components/WalletProvider";
import {
  getEscrowAddress,
  writeListDeal,
  waitForDealId,
  hashMetadata,
  parseContractError,
} from "@/lib/contract";
import { parseEther, type Address } from "viem";

const FC_DELIVERABLE_OPTIONS = [
  { key: "fid", label: "FID transfer (on-chain)" },
  { key: "wallet", label: "Connected wallet handover" },
  { key: "recovery", label: "Recovery address update" },
  { key: "channel", label: "Channel ownership transfer" },
  { key: "keys", label: "Signer key rotation" },
  { key: "storage", label: "Storage units transfer" },
  { key: "casts", label: "Cast history export" },
  { key: "verifications", label: "Verification removal" },
] as const;

export default function ListFidModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [fid, setFid] = useState("");
  const [handle, setHandle] = useState("");
  const [channel, setChannel] = useState("");
  const [followers, setFollowers] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deliverables, setDeliverables] = useState<Record<string, boolean>>({});
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const toggleDeliverable = (key: string) =>
    setDeliverables((p) => ({ ...p, [key]: !p[key] }));

  const checkFarcasterVerification = async () => {
    if (!fid || !address) return;
    setVerifying(true);
    try {
      const res = await fetch(
        `/api/verify?type=farcaster&fid=${fid}&address=${address}`,
      );
      const json = await res.json();
      if (json.verified) {
        setVerified(true);
        setDone("On-chain ownership verified! Listing is visible to buyers.");
      } else {
        setError(
          `Not verified: ${json.reason || "Connected wallet does not own FID " + fid}`,
        );
      }
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
      const selectedDeliverables = FC_DELIVERABLE_OPTIONS.filter(
        (d) => deliverables[d.key],
      ).map((d) => d.label);
      const metadata = {
        fid: Number(fid),
        handle: handle.replace(/^@/, ""),
        channel: channel.replace(/^\//, "") || "general",
        followers: Number(followers || 0),
        price: Number(price),
        image: imageUrl,
        description,
        deliverables: selectedDeliverables,
        kind: "Farcaster FID",
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);
      const txHash = await writeListDeal(
        address as Address,
        parseEther(price || "0"),
        metaHash,
      );
      const contractListingId = await waitForDealId(txHash);
      const res = await fetch("/api/marketplace/farcaster", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAddress: address,
          title: handle.startsWith("@") ? handle.slice(1) : handle,
          description:
            description ||
            `Farcaster FID ${fid}${channel ? ` in /${channel}` : ""}`,
          price: Number(price),
          chainId: 8453,
          contractAddress: getEscrowAddress(),
          contractListingId,
          txHash,
          data: {
            fid: Number(fid),
            handle: handle.replace(/^@/, ""),
            imageUrl,
            channel: channel.replace(/^\//, "") || "general",
            followers: Number(followers || 0),
            casts_30d: 0,
            rev_30d: 0,
            power_badge: false,
            verified: false,
            includes: selectedDeliverables,
            metadataHash: metaHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Unable to submit FID listing");
      setVerified(false);
      setDone("Listed on-chain. Verify on-chain ownership to make it visible.");
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
            List Farcaster FID
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
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">FID</span>
              <input
                className="input mono"
                value={fid}
                onChange={(e) => setFid(e.target.value)}
                placeholder="12345"
              />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Handle</span>
              <input
                className="input"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@founder"
              />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Primary channel</span>
              <input
                className="input"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="/crypto"
              />
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Followers</span>
              <input
                className="input mono"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="25000"
              />
            </div>
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="label">Asking price (Ξ)</span>
              <input
                className="input mono"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="8.5"
              />
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
          </div>
          <div className="col" style={{ gap: 6 }}>
            <span className="label">Deliverables ({Object.values(deliverables).filter(Boolean).length} selected)</span>
            <div className="grid grid-2" style={{ gap: 6 }}>
              {FC_DELIVERABLE_OPTIONS.map((d) => (
                <label key={d.key} style={{ padding: "8px 10px", border: deliverables[d.key] ? "1px solid var(--accent)" : "1px solid var(--line)", borderRadius: 6, cursor: "pointer", background: deliverables[d.key] ? "rgba(127,157,197,0.08)" : "transparent", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!deliverables[d.key]} onChange={() => toggleDeliverable(d.key)} style={{ accentColor: "var(--accent)" }} />
                  {d.label}
                </label>
              ))}
            </div>
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
              placeholder="What comes with this FID?"
            />
          </div>
          <div className="modal-f">
            <button
              className="btn"
              style={{ flex: 1 }}
              onClick={() => {
                onClose();
                setDone("");
                setVerified(false);
              }}
            >
              Close
            </button>
            {!done ? (
              <button
                className="btn primary lg"
                style={{ flex: 1 }}
                onClick={submitListing}
                disabled={submitting || !fid || !handle || !price}
              >
                {submitting ? "Signing & listing…" : "Submit for review"}
              </button>
            ) : (
              <button
                className="btn primary lg"
                style={{ flex: 1 }}
                disabled={!verified}
                onClick={onClose}
              >
                {verified ? "Done" : "Awaiting verification"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
