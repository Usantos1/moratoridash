import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminApi, getAdminToken, setAdminToken } from "../../lib/admin-api";
import { AdminButton } from "../../components/admin/ui";

const NAV = [
  { to: "/admin", end: true, label: "Leads", hint: "Pipeline" },
  { to: "/admin/marca", label: "Marca", hint: "Identidade" },
  { to: "/admin/pages", label: "Páginas", hint: "Diagnóstico" },
  { to: "/admin/whatsapp", label: "WhatsApp", hint: "Comercial" },
  { to: "/admin/flows", label: "Fluxo", hint: "Chat runtime" },
  { to: "/admin/deliveries", label: "Entregas", hint: "Tracking" },
] as const;

export function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      navigate("/admin/login");
      return;
    }
    adminApi
      .me()
      .then((res) => {
        setUser(res.user);
        setReady(true);
      })
      .catch(() => {
        setAdminToken(null);
        navigate("/admin/login");
      });
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--ink)] text-white/50">
        <div className="anim-rise text-center">
          <div className="font-display text-2xl font-bold tracking-tight">
            MURATORI <span className="text-[var(--leaf)]">DASH</span>
          </div>
          <p className="mt-2 text-sm">Abrindo o painel…</p>
        </div>
      </div>
    );
  }

  function logout() {
    setAdminToken(null);
    navigate("/admin/login");
  }

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center justify-between gap-3 border-l-2 px-3 py-2.5 text-sm transition ${
      isActive
        ? "border-[var(--leaf)] bg-[var(--leaf)]/10 text-white"
        : "border-transparent text-white/55 hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
    }`;

  const sidebar = (
    <>
      <div className="px-5 pt-6 pb-4">
        <Link to="/admin" className="block" onClick={() => setMobileOpen(false)}>
          <div className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--leaf)]">
            Muratori
          </div>
          <div className="font-display mt-1 text-2xl font-extrabold tracking-tight text-white">
            DASH
          </div>
        </Link>
        <p className="mt-2 text-xs leading-relaxed text-white/40">
          Operação da instalação · leads, marca e fluxo
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : false}
            className={navLink}
            onClick={() => setMobileOpen(false)}
          >
            <span className="font-semibold">{item.label}</span>
            <span className="text-[10px] uppercase tracking-wide text-white/30 group-[.active]:text-[var(--leaf)]/70">
              {item.hint}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/[0.06] p-4">
        <div className="truncate text-sm font-medium text-white/80">
          {user?.name || user?.email}
        </div>
        <div className="truncate text-xs text-white/35">{user?.email}</div>
        <div className="mt-3 flex gap-2">
          <Link
            to="/"
            className="flex-1 border border-white/10 px-3 py-2 text-center text-xs text-white/60 hover:border-white/25 hover:text-white"
          >
            Site
          </Link>
          <AdminButton variant="ghost" className="flex-1 !py-2 text-xs" onClick={logout}>
            Sair
          </AdminButton>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative min-h-[100dvh] bg-[var(--ink)] text-[#f3f7f4]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 60% at 0% 0%, rgba(28,59,50,0.55) 0%, transparent 55%), radial-gradient(70% 50% at 100% 0%, rgba(182,242,108,0.08) 0%, transparent 45%), linear-gradient(180deg, #070b0a 0%, #0a100e 100%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage:
            "linear-gradient(rgba(182,242,108,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(182,242,108,0.07) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at top left, black 10%, transparent 70%)",
        }} />
      </div>

      <div className="relative z-10 flex min-h-[100dvh]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0a110f]/80 backdrop-blur-md lg:flex">
          {sidebar}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0a110f]/70 px-4 py-3 backdrop-blur-md lg:hidden">
            <button
              type="button"
              className="border border-white/10 px-3 py-2 text-xs font-semibold text-white/70"
              onClick={() => setMobileOpen(true)}
            >
              Menu
            </button>
            <div className="font-display text-sm font-bold tracking-wide">
              MURATORI <span className="text-[var(--leaf)]">DASH</span>
            </div>
            <AdminButton variant="ghost" className="!px-3 !py-2 text-xs" onClick={logout}>
              Sair
            </AdminButton>
          </header>

          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/60"
                aria-label="Fechar menu"
                onClick={() => setMobileOpen(false)}
              />
              <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-[#0a110f] shadow-2xl">
                <div className="flex justify-end p-3">
                  <button
                    type="button"
                    className="text-sm text-white/50"
                    onClick={() => setMobileOpen(false)}
                  >
                    Fechar
                  </button>
                </div>
                {sidebar}
              </aside>
            </div>
          )}

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
