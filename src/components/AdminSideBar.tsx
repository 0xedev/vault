"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./icons";
import { ADMIN_DISPUTES, ADMIN_TICKETS, ADMIN_LISTINGS, ADMIN_VERIFICATIONS } from "@/lib/admin-data";

interface SidebarItem {
  sec?: string;
  k?: string;
  t?: string;
  icon?: React.ReactNode;
  badge?: string;
}

export default function AdminSideBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const items: SidebarItem[] = [
    { sec: "Operations" },
    { k: "/admin/dash",          t: "Dashboard",      icon: <Icon.home/> },
    { k: "/admin/disputes",      t: "Disputes",       icon: <Icon.warn/>,   badge: ADMIN_DISPUTES.filter(d => d.status !== "resolved").length+"" },
    { k: "/admin/tickets",       t: "Support",        icon: <Icon.bell/>,   badge: ADMIN_TICKETS.filter(t => t.unread).length+"" },
    { sec: "Moderation" },
    { k: "/admin/listings",      t: "Listings",       icon: <Icon.market/>, badge: ADMIN_LISTINGS.filter(l => l.status === "pending").length+"" },
    { k: "/admin/users",         t: "Users",          icon: <Icon.shield/> },
    { k: "/admin/verifications", t: "Verifications",  icon: <Icon.check/>,  badge: ADMIN_VERIFICATIONS.filter(v => v.status === "pending").length+"" },
    { sec: "System" },
    { k: "/admin/admin-escrow",  t: "Escrow ops",     icon: <Icon.escrow/> },
    { k: "/admin/audit",         t: "Audit log",      icon: <Icon.clock/> },
  ];

  return (
    <aside className={"sidebar admin-sidebar" + (open ? " open" : "")}>
      {items.map((it, i) => it.sec
        ? <div className="side-h" key={"s"+i}>{it.sec}</div>
        : (
          <Link
            key={it.k}
            href={it.k!}
            className={"side-link" + (pathname === it.k ? " active" : "")}
            onClick={onClose}
          >
            <span className="icn">{it.icon}</span>
            <span>{it.t}</span>
            {it.badge && it.badge !== "0" && <span className="badge admin-badge-pill">{it.badge}</span>}
          </Link>
        )
      )}
      <div style={{ flex: 1 }}/>
      <div className="card" style={{ padding: 12, marginTop: 20, borderColor: "color-mix(in oklab, var(--risk) 30%, transparent)" }}>
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <Icon.shield style={{ color: "var(--risk)" }}/>
          <span className="smallcaps" style={{ color: "var(--risk)" }}>Admin · L4</span>
        </div>
        <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.4 }}>
          All actions are logged + signed. <a className="lnk" href="#">Policies ↗</a>
        </div>
      </div>
    </aside>
  );
}
