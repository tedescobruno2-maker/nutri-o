"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/kanban", label: "Kanban", icon: "🗂️" },
  { href: "/clients", label: "Clientes", icon: "👥" },
  { href: "/recipes", label: "Receitas", icon: "🍽️" },
  { href: "/alimentos", label: "Alimentos", icon: "🥕" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">🥗</div>
        <div>
          <div className="brand-title">NutriKanban</div>
          <div className="brand-sub">Acompanhamento nutricional</div>
        </div>
      </div>

      <nav className="nav-group">
        <span className="nav-label">Menu</span>
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-link", active && "active")}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer nav-group">
        <span className="nav-label">Sistema</span>
        <div className="nav-link" style={{ cursor: "default" }}>
          <span className="nav-icon">🌱</span>
          <span>v1.0 · local</span>
        </div>
      </div>
    </aside>
  );
}
