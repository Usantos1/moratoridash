import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { adminApi, setAdminToken } from "../../lib/admin-api";
import { setActiveWorkspaceId } from "../../lib/session";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[var(--leaf)]/55 focus:ring-2 focus:ring-[var(--leaf)]/20";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--ink)] text-[#f5f0ec]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 70% at 85% 10%, rgba(59,24,18,0.9) 0%, transparent 55%), linear-gradient(155deg, #0a0a0a 0%, #141110 45%, #0f0c0b 100%)",
          }}
        />
        <div className="anim-glow absolute -right-24 top-[-15%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(249,76,48,0.22),transparent_68%)] blur-2xl" />
        <div className="absolute bottom-[-30%] left-[-20%] h-[55vh] w-[55vh] rounded-full bg-[radial-gradient(circle,rgba(59,24,18,0.65),transparent_70%)] blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-lg items-center justify-between px-6 pt-8 sm:px-0">
        <Link to="/" className="inline-flex items-baseline gap-1.5 select-none">
          <span className="text-[17px] font-extrabold tracking-tight text-[#6ba3ff]">
            MURATORI
          </span>
          <span className="text-[17px] font-extrabold tracking-tight text-[var(--leaf)]">
            DASH
          </span>
        </Link>
        <Link
          to="/"
          className="text-sm font-medium text-white/45 transition hover:text-white"
        >
          Voltar ao site
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="anim-rise w-full max-w-md">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Entrar no painel
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50 sm:text-[15px]">
            Formulários inteligentes, leads e builder — no workspace da sua operação.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-10 space-y-5 border-t border-white/[0.08] pt-8"
          >
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                E-mail
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                autoComplete="username"
                placeholder="time@suaagencia.com"
                className={`mt-1.5 ${fieldClass}`}
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Senha
              </span>
              <div className="relative mt-1.5">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${fieldClass} pr-11`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/40 transition hover:text-white"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[var(--leaf)] px-6 py-3.5 text-sm font-bold tracking-wide text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Entrar no painel"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
