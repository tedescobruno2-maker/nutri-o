import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export default async function SetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="public-shell">
      <div className="public-header">
        <div style={{ fontSize: "2rem" }}>🥗</div>
        <h1>Defina sua senha</h1>
        <p className="text-muted">Escolha uma senha para acessar seu acesso na Nutri Luana Gois.</p>
      </div>

      <SetPasswordForm token={token} />
    </div>
  );
}
