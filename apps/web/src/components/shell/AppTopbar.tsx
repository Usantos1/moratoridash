import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Menu,
  Moon,
  Search,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { MENU_GROUPS, PRIMARY_NAV, filterNav } from "../../lib/navigation";
import { useSession } from "../../lib/session-context";

type Props = {
  onLogout: () => void;
};

const pillBase =
  "inline-flex h-11 items-center gap-2 rounded-full border border-[#d8dde6] bg-white px-4 text-sm font-medium text-[#1d202b] shadow-[0_1px_0_rgba(16,24,40,0.04)] transition hover:border-primary/35 hover:bg-[#f8fafc]";

export function AppTopbar({ onLogout }: Props) {
  const navigate = useNavigate();
  const { user, workspace, workspaces, can, switchWorkspace } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!menuOpen && !langOpen && !wsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setLangOpen(false);
        setWsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, langOpen, wsOpen]);

  const clock = useMemo(
    () =>
      now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [now]
  );

  const primaryNav = useMemo(() => filterNav(PRIMARY_NAV, can), [can]);
  const menuGroups = useMemo(
    () =>
      MENU_GROUPS.map((group) => ({ ...group, items: filterNav(group.items, can) })).filter(
        (group) => group.items.length > 0
      ),
    [can]
  );

  const workspaceInitial = (workspace?.name || "M")[0].toUpperCase();

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 w-full border-b border-[#e8ecf2] bg-white"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-[4.5rem] w-full items-center gap-2 px-3 sm:px-4 md:gap-2.5 md:px-5">
        {/* —— Esquerda: logo + pills + menu + search —— */}
        <div className="flex min-w-0 items-center gap-2 md:gap-2.5">
          <BrandLogo />

          <nav className="ml-1 hidden items-center gap-2 lg:flex">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end ?? false}
                  className={({ isActive }) =>
                    `inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
                      isActive
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-[#d8dde6] bg-white text-[#1d202b] shadow-[0_1px_0_rgba(16,24,40,0.04)] hover:border-primary/35 hover:bg-[#f8fafc]"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="relative">
            <button
              type="button"
              className={`${pillBase} relative pl-3.5 pr-2.5`}
              onClick={() => {
                setLangOpen(false);
                setWsOpen(false);
                setMenuOpen((v) => !v);
              }}
            >
              <Menu className="h-4 w-4 text-brand-600" strokeWidth={2} />
              <span>Menu</span>
              <ChevronDown className="h-4 w-4 text-[#6b7280]" />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 bg-transparent"
                  aria-label="Fechar"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute left-0 top-[calc(100%+0.55rem)] z-50 max-h-[72vh] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-[28px] border border-[#e5e7eb] bg-white p-3 shadow-[0_18px_50px_rgba(16,24,40,0.18)]">
                  <div className="mb-2 border-b border-[#eef0f4] px-3 pb-3">
                    <div className="text-[15px] font-semibold text-[#1d202b]">
                      {user.name || "Admin"}
                    </div>
                    <div className="truncate text-xs text-[#6b7280]">{user.email}</div>
                    {workspace?.role && (
                      <div className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        {workspace.role.name}
                      </div>
                    )}
                  </div>
                  {menuGroups.map((group) => (
                    <div key={group.group} className="mb-2">
                      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                        {group.group}
                      </div>
                      <ul className="space-y-0.5">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <li key={item.to + item.label}>
                              <NavLink
                                to={item.to}
                                end={item.end ?? false}
                                onClick={() => setMenuOpen(false)}
                                className={({ isActive }) =>
                                  `flex items-center gap-3 rounded-2xl border-l-2 px-3 py-3 transition ${
                                    isActive
                                      ? "border-l-primary bg-primary/10"
                                      : "border-l-transparent hover:border-l-brand-600 hover:bg-[#f3f4f6]"
                                  }`
                                }
                              >
                                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ebf3ff] text-brand-600">
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-[15px] font-semibold text-[#1d202b]">
                                    {item.label}
                                  </span>
                                  <span className="block text-xs leading-5 text-[#6b7280]">
                                    {item.desc}
                                  </span>
                                </span>
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  <div className="mt-1 border-t border-[#eef0f4] pt-2">
                    <Link
                      to="/"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-2xl px-3 py-3 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1d202b]"
                    >
                      Ver site público
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-[#ef4444] hover:bg-red-50"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-[#d8dde6] bg-white text-brand-600 shadow-[0_1px_0_rgba(16,24,40,0.04)] hover:bg-[#f8fafc] sm:inline-flex"
            aria-label="Buscar"
            onClick={() => navigate("/admin")}
          >
            <Search className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* —— Direita: workspace + relógio + idioma + ícones + avatar —— */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden xl:block">
            <button
              type="button"
              className="h-11 max-w-[220px] items-center gap-2 rounded-full border border-primary/45 bg-white px-3 text-left shadow-[0_1px_0_rgba(16,24,40,0.04)] inline-flex"
              title="Trocar workspace"
              onClick={() => {
                setMenuOpen(false);
                setLangOpen(false);
                setWsOpen((v) => !v);
              }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-extrabold text-primary">
                {workspaceInitial}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] font-bold text-[#1d202b]">
                  {workspace?.name ?? "Sem workspace"}
                </span>
                <span className="block truncate text-[11px] font-semibold text-primary">
                  {workspace?.role?.name ?? "Workspace ativo"}
                </span>
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-primary" />
            </button>

            {wsOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="Fechar"
                  onClick={() => setWsOpen(false)}
                />
                <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-72 rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-lg">
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                    Workspaces
                  </div>
                  <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                    {workspaces.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-[#f3f4f6] ${
                            item.id === workspace?.id ? "bg-primary/10 font-semibold" : ""
                          }`}
                          onClick={async () => {
                            setWsOpen(false);
                            if (item.id !== workspace?.id) await switchWorkspace(item.id);
                          }}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-extrabold text-primary">
                            {item.name[0].toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[#1d202b]">{item.name}</span>
                            <span className="block truncate text-[11px] text-[#6b7280]">
                              {item.role?.name ?? "Sem cargo"} · {item.slug}
                            </span>
                          </span>
                          {item.id === workspace?.id && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {user.role === "superadmin" && (
                    <div className="mt-1 border-t border-[#eef0f4] pt-1">
                      <Link
                        to="/admin/workspace"
                        onClick={() => setWsOpen(false)}
                        className="block rounded-xl px-3 py-2.5 text-sm font-medium text-primary hover:bg-[#f3f4f6]"
                      >
                        Gerenciar workspaces
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="hidden h-9 items-center rounded-full border border-[#d8dde6] bg-[#f3f4f6]/70 px-3 font-mono text-xs font-semibold tabular-nums text-[#1d202b] lg:inline-flex">
            {clock}
          </div>

          <div className="relative hidden lg:block">
            <button
              type="button"
              className={`${pillBase} gap-2 px-3`}
              onClick={() => {
                setMenuOpen(false);
                setWsOpen(false);
                setLangOpen((v) => !v);
              }}
            >
              <span className="text-base leading-none" aria-hidden>
                🇧🇷
              </span>
              <span>Português</span>
              <ChevronDown className="h-4 w-4 text-[#6b7280]" />
            </button>
            {langOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="Fechar"
                  onClick={() => setLangOpen(false)}
                />
                <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-44 rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[#1d202b] hover:bg-[#f3f4f6]"
                    onClick={() => setLangOpen(false)}
                  >
                    🇧🇷 Português
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1d202b] lg:inline-flex"
            aria-label="Tema"
          >
            <Moon className="h-4 w-4" strokeWidth={2} />
          </button>

          <button
            type="button"
            className="relative hidden h-10 w-10 items-center justify-center rounded-full text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1d202b] lg:inline-flex"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" strokeWidth={2} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#ebf3ff] text-sm font-bold text-brand-600 ring-1 ring-[#d8dde6] hover:ring-primary/40"
            title={user.email}
            onClick={() => {
              setLangOpen(false);
              setWsOpen(false);
              setMenuOpen((v) => !v);
            }}
          >
            {(user.name || user.email || "M")[0].toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
}
