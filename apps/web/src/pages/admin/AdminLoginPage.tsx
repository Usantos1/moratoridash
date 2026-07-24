import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { adminApi, setAdminToken } from "../../lib/admin-api";
import { setActiveWorkspaceId } from "../../lib/session";
import { AdminButton, AdminField, AdminInput } from "../../components/admin/ui";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminApi.login(email, password);
      setAdminToken(res.token);
      setActiveWorkspaceId(res.activeWorkspaceId);
      toast.success("Bem-vindo ao Muratori Dash");
      navigate("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f1f3f6] px-4 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.12),transparent_52%)]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-[28px] border border-border/70 bg-card p-8 shadow-[var(--shadow-surface)] sm:p-10"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Muratori</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Dash</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Entre no painel da instalação — formulários inteligentes, leads e builder.
        </p>

        <div className="mt-8 space-y-4">
          <AdminField label="E-mail">
            <AdminInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="username"
              placeholder="time@suaagencia.com"
            />
          </AdminField>
          <AdminField label="Senha">
            <AdminInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </AdminField>
        </div>

        <AdminButton type="submit" disabled={loading} className="mt-8 w-full !py-3">
          {loading ? "Entrando…" : "Entrar no painel"}
        </AdminButton>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="font-medium text-foreground underline-offset-2 hover:text-primary hover:underline">
            Voltar ao site
          </Link>
        </p>
      </form>
    </div>
  );
}
