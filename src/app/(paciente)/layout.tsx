import type { Metadata } from "next";
import "../globals.css";
import { PatientTopbar } from "@/components/layout/PatientTopbar";
import { PatientSidebar } from "@/components/layout/PatientSidebar";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Meu Portal — Nutri Luana Gois",
  description: "Portal do paciente",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("nlg-theme");
    if (!stored) {
      var legacy = localStorage.getItem("nutrikanban-theme");
      if (legacy) { stored = legacy; localStorage.setItem("nlg-theme", legacy); }
    }
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const restricted = user?.portalScope === "SOMENTE_PLANO";

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <div className="app-shell">
          <PatientSidebar restricted={restricted} />
          <div className="app-main">
            <PatientTopbar />
            <main className="app-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
