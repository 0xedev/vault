"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./icons";

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
    { k: "/admin/disputes",      t: "Disputes",       icon: <Icon.warn/> },
    { k: "/admin/tickets",       t: "Support",        icon: <Icon.bell/> },
    { sec: "Oversight" },
    { k: "/admin/listings",      t: "Listings",       icon: <Icon.market/> },
    { k: "/admin/users",         t: "Users",          icon: <Icon.shield/> },
    { k: "/admin/verifications", t: "Verifications",  icon: <Icon.check/> },
    { sec: "System" },
    { k: "/admin/admin-escrow",  t: "Escrow ops",     icon: <Icon.escrow/> },
    { k: "/admin/audit",         t: "Audit log",      icon: <Icon.clock/> },
  ];

  return (
    <aside className={"sidebar admin-sidebar" + (open ? " open" : "")}>
      <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
        <Icon.x />
      </button>
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
