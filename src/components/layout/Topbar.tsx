import { ThemeToggle } from "./ThemeToggle";

export function Topbar() {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">NutriKanban</div>
        <div className="text-muted" style={{ fontSize: "0.85rem" }}>
          Gestão de clientes e planos nutricionais
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ThemeToggle />
        <div className="avatar" title="Nutricionista">
          NU
        </div>
      </div>
    </header>
  );
}
