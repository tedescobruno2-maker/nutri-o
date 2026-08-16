import Link from "next/link";
import { cn } from "@/lib/utils";

const VIEWS = [
  { value: "tabela", label: "Tabela", icon: "📋" },
  { value: "cards", label: "Cards", icon: "🪪" },
  { value: "kanban", label: "Kanban", icon: "🗂️" },
  { value: "calendario", label: "Calendário", icon: "📅" },
] as const;

export function ViewSwitcher({ current, q }: { current: string; q?: string }) {
  return (
    <div className="view-switcher">
      {VIEWS.map((v) => {
        const params = new URLSearchParams();
        params.set("view", v.value);
        if (q) params.set("q", q);
        return (
          <Link
            key={v.value}
            href={`/clients?${params.toString()}`}
            className={cn("view-switcher-tab", current === v.value && "active")}
          >
            <span>{v.icon}</span>
            {v.label}
          </Link>
        );
      })}
    </div>
  );
}
