import type { Metadata } from "next";
import "../globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export const metadata: Metadata = {
  title: "Nutri Luana Gois",
  description: "Sistema de acompanhamento nutricional para pacientes",
};

// Lê a chave nova ("nlg-theme"); se ausente, cai para a chave antiga ("nutrikanban-theme",
// nome do sistema antes da Fase 0) e já migra o valor para a chave nova.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("nlg-theme");
    if (!stored) {
      var legacy = localStorage.getItem("nutrikanban-theme");
      if (legacy) {
        stored = legacy;
        localStorage.setItem("nlg-theme", legacy);
      }
    }
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="app-main">
            <Topbar />
            <main className="app-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
