import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/admin", end: true, label: "Dashboard" },
  { to: "/admin/pages", label: "Páginas" },
  { to: "/admin/flows", label: "Builder" },
  { to: "/admin/leads", label: "Leads" },
  { to: "/admin/whatsapp", label: "WhatsApp" },
  { to: "/admin/marca", label: "Marca" },
  { to: "/admin/deliveries", label: "Entregas" },
] as const;

/** Nav interna do módulo Formulário Inteligente */
export function FormsModuleNav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={"end" in item ? item.end : false}
          className={({ isActive }) =>
            `rounded-full border px-3 py-1.5 text-xs font-semibold tracking-tight transition ${
              isActive
                ? "border-primary/45 bg-primary/12 text-primary shadow-[var(--shadow-surface-sm)]"
                : "border-border/55 bg-card/50 text-muted-foreground hover:border-primary/25 hover:text-foreground"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
