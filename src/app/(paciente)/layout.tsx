import type { Metadata } from "next";
import "../globals.css";
import { PatientTopbar } from "@/components/layout/PatientTopbar";

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

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <div className="app-main">
          <PatientTopbar />
          <main className="app-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
