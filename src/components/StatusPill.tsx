type Status =
  | "open" | "funded" | "repaid" | "default" | "warn"
  | "active" | "pending" | "released" | "Open" | "Funded"
  | "Active" | "Transfer" | "Funds locked" | "At risk" | "Released";

const statusMap: Record<string, [string, string]> = {
  open:    ["open",    "Open"],
  funded:  ["funded",  "Funded"],
  repaid:  ["repaid",  "Repaid"],
  default: ["default", "Defaulted"],
  warn:    ["warn",    "At risk"],
  active:  ["funded",  "Active"],
  pending: ["open",    "Pending"],
  released:["repaid",  "Released"],
  Open:    ["open",    "Open"],
  Funded:  ["funded",  "Funded"],
  Active:   ["funded",  "Active"],
  "Funds locked": ["", "Funds locked"],
  "At risk": ["warn", "At risk"],
  Released: ["repaid", "Released"],
  Transfer: ["open", "Transfer"],
};

export default function StatusPill({ s }: { s: Status | string }) {
  const [cls, label] = statusMap[s] || ["", s];
  return <span className={"pill " + cls}><span className="pdot"/>{label}</span>;
}
