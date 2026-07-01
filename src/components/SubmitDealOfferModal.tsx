"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWallet } from "@/components/WalletProvider";
import { getDealsAddress, getWalletClient, parseContractError } from "@/lib/contract";
import { isOwnListing as ownsListing } from "@/lib/identity";
import { buildSignedDealOfferTypedData, expiryFromHours, offerNonce } from "@/lib/signed-offers";
import type { Address } from "viem";

type Props = {
  listing: {
    id: string;
    title: string;
    price: number;
    sellerAddress?: string;
    contractListingId?: string;
    contractAddress?: string;
    chainId?: number;
  };
  onClose: () => void;
  onSubmitted?: () => void;
};

export default function SubmitDealOfferModal({ listing, onClose, onSubmitted }: Props) {
  const { address, sessionAddress, isConnected, isConnecting, connect } = useWallet();
  const [amount, setAmount] = useState(String(listing.price || ""));
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const submitOffer = async () => {
    if (!address) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      if (!listing.sellerAddress) throw new Error("Listing seller is missing.");
      if (ownsListing(listing, { address, sessionAddress })) throw new Error("You cannot offer on your own listing.");
      if (!listing.contractListingId) throw new Error("Listing is pending chain sync. Try again after the listing transaction is confirmed.");
      const expiry = expiryFromHours(expiresInHours);
      const nonce = offerNonce();
      const typedData = buildSignedDealOfferTypedData({
        verifyingContract: (listing.contractAddress || await getDealsAddress()) as Address,
        chainId: listing.chainId || 8453,
        dealId: listing.contractListingId,
        buyer: address as Address,
        amount,
        expiry,
        nonce,
      });
      const signature = await getWalletClient().signTypedData({
        account: address as Address,
        ...typedData,
      });
      const res = await fetch("/api/offers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          offererAddress: address,
          amount: Number(amount),
          expiry: expiry.toString(),
          nonce: nonce.toString(),
          signature,
          chainId: listing.chainId || 8453,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Unable to submit offer");
      setNotice("Offer submitted. Funds move only if the seller accepts and your USDC allowance/balance is still valid.");
      onSubmitted?.();
    } catch (err) {
      setError(parseContractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="eyebrow">Signed offer</div>
          <DialogTitle>{listing.title}</DialogTitle>
          <DialogDescription>
            Sign an off-chain offer. Funds only move if the seller accepts and your USDC balance plus allowance are still valid.
          </DialogDescription>
        </DialogHeader>
        <div className="col" style={{ gap: 14 }}>
          <div>
            <Label htmlFor="deal-offer-amount">Offer amount (USDC)</Label>
            <Input id="deal-offer-amount" className="mono" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Expires in</Label>
            <Select value={String(expiresInHours)} onValueChange={(value) => setExpiresInHours(Number(value))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="72">3 days</SelectItem>
                <SelectItem value="168">7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            This does not lock funds now. If accepted, the contract will try to pull USDC from your wallet using your current balance and allowance.
          </p>
          {notice && <div className="warn-banner" style={{ fontSize: 12 }}>{notice}</div>}
          {error && <div className="warn-banner" style={{ color: "var(--risk)", fontSize: 12 }}>{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {isConnected ? (
            <Button onClick={submitOffer} disabled={submitting || Number(amount) <= 0}>
              {submitting ? "Signing..." : "Submit offer"}
            </Button>
          ) : (
            <Button onClick={connect} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect wallet"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
