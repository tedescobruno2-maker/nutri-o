import { login } from "@/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="public-shell">
      <div className="public-header">
        <div style={{ fontSize: "2rem" }}>🥗</div>
        <h1>Nutri Luana Gois</h1>
        <p className="text-muted">Acesso restrito — informe a senha para continuar.</p>
      </div>

      <form action={login} className="card glass card-pad" style={{ width: "min(360px, 100%)", display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="next" value={next ?? "/"} />
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input className="input" id="password" name="password" type="password" required autoFocus />
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>Senha incorreta. Tente novamente.</p>}
        <button type="submit" className="btn btn-primary">
          Entrar
        </button>
      </form>
    </div>
  );
}
