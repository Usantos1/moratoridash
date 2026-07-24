import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { adminApi, setAdminToken } from "../../lib/admin-api";
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
      toast.success("Bem-vindo ao Muratori Dash");
      navigate("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grain relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--ink)] px-4">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(100% 70% at 50% 0%, rgba(28,59,50,0.85) 0%, transparent 55%), linear-gradient(165deg, #070b0a 0%, #0e1614 50%, #08110e 100%)",
          }}
        />
        <div className="anim-glow absolute left-1/2 top-[-20%] h-[55vh] w-[55vh] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(182,242,108,0.2),transparent_68%)] blur-2xl" />
      </div>

      <form
        onSubmit={onSubmit}
        className="anim-rise relative w-full max-w-md border border-white/[0.08] bg-[#0c1412]/90 p-8 shadow-[0_40px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-10"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--leaf)]/50 to-transparent" />

        <p className="font-display text-[11px] font-bold uppercase tracking-[0.32em] text-[var(--leaf)]">
          Muratori
        </p>
        <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-white">
          DASH
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          Entre no painel da instalação para leads, marca e fluxo do diagnóstico.
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

        <AdminButton
          type="submit"
          disabled={loading}
          className="mt-8 w-full !py-3"
        >
          {loading ? "Entrando…" : "Entrar no painel"}
        </AdminButton>

        <p className="mt-6 text-center text-xs text-white/35">
          <Link to="/" className="text-white/55 underline-offset-2 hover:text-[var(--leaf)] hover:underline">
            Voltar ao site
          </Link>
        </p>
      </form>
    </div>
  );
}
