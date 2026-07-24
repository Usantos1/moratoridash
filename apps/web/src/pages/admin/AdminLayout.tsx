import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminApi, getAdminToken, setAdminToken } from "../../lib/admin-api";

export function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);

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
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--ink)] text-white/60">
        Carregando painel…
      </div>
    );
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-white/10 text-[var(--leaf)]" : "text-white/70 hover:text-white"
    }`;

  return (
    <div className="min-h-[100dvh] bg-[var(--ink)] text-[#f3f7f4]">
      <header className="border-b border-white/10 bg-[#0e1614]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="font-display text-lg font-bold">
              Muratori <span className="text-[var(--leaf)]">Admin</span>
            </Link>
            <nav className="flex flex-wrap gap-1">
              <NavLink to="/admin" end className={linkClass}>
                Leads
              </NavLink>
              <NavLink to="/admin/pages" className={linkClass}>
                Páginas
              </NavLink>
              <NavLink to="/admin/whatsapp" className={linkClass}>
                WhatsApp
              </NavLink>
              <NavLink to="/admin/deliveries" className={linkClass}>
                Entregas
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/60">
            <span>{user?.name || user?.email}</span>
            <button
              type="button"
              className="border border-white/15 px-3 py-1.5 hover:border-white/40"
              onClick={() => {
                setAdminToken(null);
                navigate("/admin/login");
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
