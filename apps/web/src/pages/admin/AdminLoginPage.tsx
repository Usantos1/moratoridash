import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { adminApi, setAdminToken } from "../../lib/admin-api";

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
      toast.success("Bem-vindo");
      navigate("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--ink)] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm border border-white/10 bg-[#0e1614] p-8 shadow-2xl"
      >
        <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-[var(--leaf)]">
          Muratori Dash
        </p>
        <h1 className="font-display mt-3 text-3xl font-extrabold text-white">Admin</h1>
        <p className="mt-2 text-sm text-white/60">Acesse o painel da instalação.</p>

        <label className="mt-8 block text-xs font-semibold uppercase tracking-wide text-white/50">
          E-mail
          <input
            className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-[var(--leaf)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="username"
          />
        </label>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-white/50">
          Senha
          <input
            className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-[var(--leaf)]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete="current-password"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full bg-[var(--leaf)] py-3 text-sm font-bold text-[#0a140f] disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
