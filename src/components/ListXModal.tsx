"use client";

import React, { useState } from "react";
import Icon from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/components/WalletProvider";
import {
  getEscrowAddress,
  writeListDeal,
  waitForDealId,
  hashMetadata,
  parseContractError,
} from "@/lib/contract";
import { parseUnits, type Address } from "viem";

export default function ListXModal({ onClose }: { onClose: () => void }) {
  const { address } = useWallet();
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submitListing = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      const normalized = handle.startsWith("@") ? handle : `@${handle}`;
      const metadata = {
        handle: normalized,
        followers: Number(followers || 0),
        price: Number(price),
        kind: "X Account",
        createdAt: new Date().toISOString(),
      };
      const metaHash = hashMetadata(metadata);
      const txHash = await writeListDeal(
        address as Address,
        parseUnits(price || "0", 6),
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
            description: null,
            chainId: 8453,
            contractAddress: getEscrowAddress(),
            contractListingId,
            txHash,
            data: {
              handle: normalized,
              followers: Number(followers || 0),
              engagement: 0,
              posts_30d: 0,
              growth: "0%",
              metadataHash: metaHash,
            },
          }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to submit X listing");
      setHandle("");
      setFollowers("");
      setPrice("");
      onClose();
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
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon.x />
          </Button>
        </div>
        <div
          className="modal-b col"
          style={{ gap: 14, maxHeight: "70vh", overflowY: "auto" }}
        >
          {/* Simplified inputs */}
          <div>
            <Label htmlFor="x-handle">Handle</Label>
            <Input
              id="x-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@handle"
            />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div>
              <Label htmlFor="x-followers">Followers</Label>
              <Input
                id="x-followers"
                className="mono"
                type="number"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="x-price">Price (USDC)</Label>
              <Input
                id="x-price"
                className="mono"
                type="number"
                step="0.1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <div className="warn-banner" style={{ color: "var(--risk)" }}>
              {error}
            </div>
          )}
          <div className="modal-f">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              disabled={submitting || !handle || !price}
              onClick={submitListing}
            >
              {submitting ? "Signing & listing…" : "List account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
