"use client";

import React, { useState } from "react";
import Icon from "@/components/icons";
import { shareAsCast } from "@/lib/farcaster-sdk";

export type ListingSuccessShare = {
  title: string;
  text: string;
  url: string;
};

type Props = {
  share: ListingSuccessShare;
  onClose: () => void;
};

const confetti = [
  ["8%", "#002275", "-12deg", "0s"],
  ["16%", "#2c95fe", "18deg", "0.05s"],
  ["24%", "#daa600", "42deg", "0.1s"],
  ["33%", "#EF4444", "-28deg", "0.03s"],
  ["42%", "#3B82F6", "24deg", "0.13s"],
  ["51%", "#543e00", "-18deg", "0.06s"],
  ["60%", "#005fac", "31deg", "0.11s"],
  ["69%", "#f7be1d", "-36deg", "0.02s"],
  ["78%", "#0035a8", "16deg", "0.08s"],
  ["87%", "#FF6B6B", "-22deg", "0.16s"],
  ["94%", "#94aaff", "34deg", "0.04s"],
] as const;

export function ListingSuccessModal({ share, onClose }: Props) {
  const [notice, setNotice] = useState("");
  const castText = share.text.length > 260 ? `${share.text.slice(0, 257)}...` : share.text;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(share.url);
      setNotice("Link copied.");
    } catch {
      setNotice("Unable to copy link.");
    }
  };

  const composeCast = async () => {
    const result = await shareAsCast(castText, share.url);
    setNotice(result ? "Cast composer opened." : "Unable to open Farcaster composer.");
  };

  const viewListing = () => {
    window.location.assign(share.url);
  };

  return (
    <div className="modal-bg listing-success-bg" onClick={onClose}>
      <div
        className="modal listing-success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-success-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="listing-success-confetti" aria-hidden="true">
          {confetti.map(([x, color, rotate, delay], index) => (
            <i
              key={`${x}-${color}`}
              style={{
                "--x": x,
                "--confetti-color": color,
                "--confetti-rotate": rotate,
                "--confetti-delay": delay,
                "--confetti-size": index % 3 === 0 ? "7px" : "5px",
              } as React.CSSProperties}
            />
          ))}
        </div>

        <div className="modal-h listing-success-head">
          <button type="button" className="btn ghost sm" onClick={onClose} aria-label="Close success modal">
            <Icon.x />
          </button>
        </div>

        <div className="modal-b listing-success-body">
          <div className="listing-success-hero" aria-hidden="true">
            <div className="listing-success-mark">
              <svg viewBox="0 0 64 72" role="img">
                <path d="M8 2h48a6 6 0 0 1 6 6v56a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6V8a6 6 0 0 1 6-6Z" />
                <path d="M15 18h34M15 30h34M15 42h20" />
                <path className="listing-success-check" d="M25 55l8 8 17-20" />
              </svg>
            </div>
          </div>
          <h3 id="listing-success-title" className="serif">
            Listed successfully
          </h3>
          <p>
            Your listing is live and ready for buyers.
          </p>

          <div className="share-preview listing-success-preview">
            <strong>{share.text}</strong>
          </div>

          <button type="button" className="btn primary listing-success-primary" onClick={viewListing}>
            View listing <Icon.arrow />
          </button>

          <div className="listing-success-share-actions">
            <button type="button" className="btn" onClick={composeCast}>
              <Icon.farcaster /> Share to Farcaster
            </button>
            <button type="button" className="btn" onClick={copyLink}>
              <Icon.link /> Copy link
            </button>
          </div>
          {notice && <div className="muted-2 listing-success-notice">{notice}</div>}
        </div>
      </div>
    </div>
  );
}
