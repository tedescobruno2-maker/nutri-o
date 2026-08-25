import { getCurrentUser } from "@/lib/session";
import { ThemeToggle } from "./ThemeToggle";
import { initials } from "@/lib/utils";

export async function PatientTopbar() {
  const user = await getCurrentUser();

  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">Nutri Luana Gois</div>
        <div className="text-muted" style={{ fontSize: "0.85rem" }}>
          Meu Portal
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ThemeToggle />
        {user && (
          <div className="avatar" title={user.name}>
            {initials(user.name)}
          </div>
        )}
      </div>
    </header>
  );
}
