"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/clients", label: "Pacientes", icon: "👥" },
  { href: "/alimentos", label: "Alimentos", icon: "🥕" },
  { href: "/recipes", label: "Receitas", icon: "🍽️" },
  { href: "/planos", label: "Plano Alimentar", icon: "📝" },
  { href: "/textos", label: "Biblioteca de Textos", icon: "📚" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">🥗</div>
        <div>
          <div className="brand-title">Nutri Luana Gois</div>
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
        <form action={logout}>
          <button type="submit" className="nav-link" style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
            <span className="nav-icon">🚪</span>
            <span>Sair</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
