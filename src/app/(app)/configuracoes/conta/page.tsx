import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { MfaSetup } from "@/components/account/MfaSetup";

export default async function AccountPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) redirect("/login");

  const needsPasswordChange = user.mustChangePassword;
  const needsMfaSetup = user.role === "ADMIN_MASTER" && !user.mfaEnabledAt && !user.mfaEverConfiguredAt;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1>Minha conta</h1>
          <p className="text-muted">Perfil profissional, senha e verificação em duas etapas.</p>
        </div>
      </div>

      {(needsPasswordChange || needsMfaSetup) && (
        <section className="section">
          <div className="card card-pad" style={{ background: "color-mix(in oklch, var(--danger) 10%, transparent)", border: "1px solid var(--danger)" }}>
            <strong>Primeiro acesso:</strong> conclua os passos abaixo antes de usar o restante do sistema.
          </div>
        </section>
      )}

      <section className="section">
        <h2 style={{ marginBottom: 12, fontSize: "1rem" }}>Perfil profissional</h2>
        <ProfileForm name={user.name} crn={user.crn} crnRegion={user.crnRegion} phone={user.phone} />
      </section>

      <section className="section">
        <h2 style={{ marginBottom: 12, fontSize: "1rem" }}>Senha</h2>
        <ChangePasswordForm required={needsPasswordChange} />
      </section>

      <section className="section">
        <h2 style={{ marginBottom: 12, fontSize: "1rem" }}>Verificação em duas etapas (MFA)</h2>
        <MfaSetup enabled={!!user.mfaEnabledAt} required={needsMfaSetup} />
      </section>
    </div>
  );
}
