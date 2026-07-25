import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { adminApi, setAdminToken } from "../../lib/admin-api";
import { setActiveWorkspaceId } from "../../lib/session";
import { getTheme, toggleTheme, type Theme } from "../../lib/theme";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

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
    "w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 100% 70% at 50% -5%, hsl(var(--primary) / 0.1), transparent 55%), hsl(var(--canvas))",
      }}
    >
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-[400px] rounded-2xl border border-border/70 bg-card p-7 shadow-[var(--shadow-surface)] sm:p-8"
      >
        <button
          type="button"
          onClick={() => setThemeState(toggleTheme())}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
          title={theme === "dark" ? "Tema claro" : "Tema escuro"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <div className="text-center">
          <Link to="/" className="inline-flex items-baseline gap-1.5 select-none">
            <span className="text-[18px] font-extrabold tracking-tight text-brand-600">
              MURATORI
            </span>
            <span className="text-[18px] font-extrabold tracking-tight text-primary">
              DASH
            </span>
          </Link>
        </div>

        <h1 className="mt-6 text-xl font-bold tracking-tight text-foreground">Entrar</h1>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              E-mail
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="username"
              placeholder="seu@email.com"
              className={`mt-1.5 ${fieldClass}`}
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
