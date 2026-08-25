import { getProfessionalSettings } from "@/lib/dal";
import { PRIVACY_POLICY_VERSION, PRIVACY_POLICY_SECTIONS, SUBPROCESSORS } from "@/lib/privacyPolicy";

export const metadata = { title: "Política de Privacidade — Nutri Luana Gois" };

export default async function PrivacyPolicyPage() {
  const settings = await getProfessionalSettings();

  return (
    <div className="public-shell" style={{ maxWidth: 720, textAlign: "left" }}>
      <div className="public-header" style={{ alignItems: "flex-start", textAlign: "left" }}>
        <div style={{ fontSize: "2rem" }}>🔒</div>
        <h1>Política de Privacidade</h1>
        <p className="text-muted">
          Versão {PRIVACY_POLICY_VERSION} · Este texto não é parecer jurídico — é um resumo de como
          tratamos os dados do consultório.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>
        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <section key={section.title} className="card card-pad">
            <h3 style={{ marginBottom: 8 }}>{section.title}</h3>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>{section.body}</p>
            {section.title === "Com quem seus dados são compartilhados" && (
              <ul style={{ marginTop: 10, paddingLeft: 18, listStyle: "disc", display: "flex", flexDirection: "column", gap: 4 }}>
                {SUBPROCESSORS.map((s) => (
                  <li key={s.name} className="text-muted" style={{ fontSize: "0.9rem" }}>
                    <strong>{s.name}</strong> — {s.purpose}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="card card-pad">
          <h3 style={{ marginBottom: 8 }}>Contato</h3>
          <p className="text-muted" style={{ lineHeight: 1.6 }}>
            {settings.nutritionistName}
            {settings.email && <> · {settings.email}</>}
            {settings.phone && <> · {settings.phone}</>}
          </p>
        </section>
      </div>
    </div>
  );
}
