"use client";

import Icon from "@/components/icons";

export type AgreementVariant = "buyer-buy" | "seller-delivery" | "buyer-release" | "dispute";

const AGREEMENTS: Record<AgreementVariant, { eyebrow: string; title: string; items: string[]; confirm: string }> = {
  "buyer-buy": {
    eyebrow: "Buyer agreement",
    title: "Confirm escrow process",
    confirm: "I understand, continue to wallet",
    items: [
      "Your funds will be locked in escrow until delivery is confirmed, refunded, or resolved through dispute.",
      "Negotiate with the seller before buying if any transfer detail is unclear.",
      "Do not release funds until you verify full ownership, access, credentials, permissions, and recovery controls.",
      "If the seller asks you to bypass escrow or move off-platform, do not proceed.",
      "Failure to follow this process may result in loss of funds. The platform is not responsible for losses caused by off-platform transfers, premature release, incomplete verification, bypassing escrow, or failure to provide delivery proof.",
    ],
  },
  "seller-delivery": {
    eyebrow: "Seller agreement",
    title: "Confirm delivery responsibilities",
    confirm: "I understand seller responsibilities",
    items: [
      "You must deliver exactly what was listed and agreed with the buyer.",
      "Transfer ownership or access only through the agreed escrow process.",
      "Do not ask the buyer to release funds before delivery is complete.",
      "Keep proof of transfer, including screenshots, transaction hashes, account transfer confirmations, repo/admin handoff logs, and delivery notes.",
      "Failure to follow this process may result in loss of funds or failed payout. The platform is not responsible for losses caused by bypassing escrow or incomplete delivery proof.",
    ],
  },
  "buyer-release": {
    eyebrow: "Buyer release agreement",
    title: "Verify before releasing funds",
    confirm: "Release funds",
    items: [
      "Releasing escrow is final or difficult to reverse.",
      "Confirm only after verifying the received asset, all included access, and recovery controls.",
      "For accounts, verify login, email, 2FA, recovery ownership, admin control, and no pending recovery lock.",
      "For apps or bundles, verify every included deliverable separately before release.",
      "If anything is missing, open a dispute instead of releasing. The platform is not responsible for premature release or incomplete verification.",
    ],
  },
  dispute: {
    eyebrow: "Dispute agreement",
    title: "Prepare dispute evidence",
    confirm: "Open dispute",
    items: [
      "Disputes require clear evidence and may delay release or refund.",
      "Include transaction hashes, screenshots, messages, account-transfer proof, and missing-delivery details.",
      "False or incomplete claims may delay resolution.",
      "Continue negotiating if the issue can still be resolved directly.",
      "The platform is not responsible for losses caused by off-platform transfers, premature release, incomplete verification, bypassing escrow, or failure to provide delivery proof.",
    ],
  },
};

export default function AgreementModal({
  variant,
  onCancel,
  onConfirm,
}: {
  variant: AgreementVariant;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const agreement = AGREEMENTS[variant];

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-h">
          <div>
            <div className="eyebrow">{agreement.eyebrow}</div>
            <h3 className="serif" style={{ margin: "4px 0 0", fontSize: 22 }}>
              {agreement.title}
            </h3>
          </div>
          <button className="btn ghost sm" onClick={onCancel} aria-label="Close agreement">
            <Icon.x />
          </button>
        </div>
        <div className="modal-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {agreement.items.map((item) => (
            <div key={item} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <Icon.check style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>{item}</span>
            </div>
          ))}
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={onConfirm}>{agreement.confirm}</button>
        </div>
      </div>
    </div>
  );
}
