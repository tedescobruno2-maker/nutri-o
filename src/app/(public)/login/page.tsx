import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="public-shell">
      <div className="public-header">
        <div style={{ fontSize: "2rem" }}>🥗</div>
        <h1>Nutri Luana Gois</h1>
        <p className="text-muted">Acesso restrito — entre com seu e-mail e senha.</p>
      </div>

      <LoginForm next={next ?? "/"} />
    </div>
  );
}
