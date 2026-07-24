import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Palette,
  Search,
  Settings2,
  Workflow,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

type Props = {
  user: { email: string; name: string | null };
  onLogout: () => void;
};

const PRIMARY_NAV = [
  { to: "/admin", end: true, label: "Formulários", icon: LayoutDashboard },
  { to: "/admin/flows", label: "Builder", icon: Workflow },
  { to: "/admin/leads", label: "Leads", icon: ClipboardList },
] as const;

const MENU_ITEMS = [
  {
    group: "Formulário inteligente",
    items: [
      { to: "/admin", label: "Dashboard de leads", desc: "Pipeline e qualificação", icon: LayoutDashboard },
      { to: "/admin/flows", label: "Fluxo / Builder", desc: "Passos e branching", icon: Workflow },
      { to: "/admin/pages", label: "Páginas", desc: "Slugs e pixels", icon: ClipboardList },
      { to: "/admin/whatsapp", label: "WhatsApp", desc: "Número e template", icon: MessageCircle },
    ],
  },
  {
    group: "Instalação",
    items: [
      { to: "/admin/marca", label: "Marca", desc: "Identidade e tracking", icon: Palette },
      { to: "/admin/deliveries", label: "Entregas", desc: "Meta, GA4, webhooks", icon: Settings2 },
    ],
  },
] as const;

export function AppTopbar({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const clock = useMemo(
    () =>
      now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [now]
  );

  const pill = ({ isActive }: { isActive: boolean }) =>
    `inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
      isActive
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border/80 bg-card text-foreground hover:border-primary/35 hover:bg-accent/50"
    }`;

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 w-full border-b border-brand-100/70 bg-background/95 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 md:px-5 md:py-3">
        <BrandLogo />

        <nav className="ml-2 hidden items-center gap-1.5 lg:flex">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : false}
                className={pill}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="relative ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-brand-200/80 bg-white pl-4 pr-2.5 text-sm font-medium text-foreground shadow-sm"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu className="h-4 w-4 text-brand-600" />
            <span className="hidden sm:inline">Menu</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          <button
            type="button"
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-brand-200/80 bg-white text-brand-600 shadow-sm sm:inline-flex"
            aria-label="Buscar"
            onClick={() => navigate("/admin")}
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="hidden h-9 items-center rounded-full border border-border bg-muted/35 px-2.5 font-mono text-xs font-semibold tabular-nums text-foreground lg:inline-flex">
            {clock}
          </div>

          <div className="hidden max-w-[180px] truncate text-right text-xs leading-tight lg:block">
            <div className="font-semibold text-foreground">{user.name || "Admin"}</div>
            <div className="text-muted-foreground">{user.email}</div>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600 ring-1 ring-border/60 hover:ring-primary/30"
            title={user.email}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {(user.name || user.email || "M")[0].toUpperCase()}
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default bg-transparent"
                aria-label="Fechar menu"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 max-h-[72vh] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-[28px] border border-border/70 bg-popover p-3 shadow-[0_18px_50px_rgba(16,24,40,0.18)]"
              >
                {MENU_ITEMS.map((group) => (
                  <div key={group.group} className="mb-2">
                    <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {group.group}
                    </div>
                    <ul className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li key={item.to}>
                            <NavLink
                              to={item.to}
                              end={item.to === "/admin"}
                              onClick={() => setMenuOpen(false)}
                              className={({ isActive }) =>
                                `flex items-center gap-3 rounded-2xl border-l-2 px-3 py-3.5 transition ${
                                  isActive
                                    ? "border-l-primary bg-primary/10"
                                    : "border-l-transparent hover:border-l-brand-600 hover:bg-muted/70"
                                }`
                              }
                            >
                              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[15px] font-semibold text-foreground">
                                  {item.label}
                                </span>
                                <span className="block text-xs leading-5 text-muted-foreground">
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

                <div className="mt-2 border-t border-border/60 pt-2">
                  <Link
                    to="/"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-2xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  >
                    Ver site público
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
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
      </div>
    </header>
  );
}
