import { NavLink } from "react-router-dom";

/** Tabs de módulo estilo Ativa (texto, sem chips pesados) — fica no header da página */
const ITEMS = [
  { to: "/admin", end: true, label: "Dashboard" },
  { to: "/admin/pages", label: "Formulários" },
  { to: "/admin/flows", label: "Builder" },
  { to: "/admin/leads", label: "Leads" },
  { to: "/admin/whatsapp", label: "Configurações" },
] as const;

export function FormsModuleNav({ className = "" }: { className?: string }) {
  return (
    <nav className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={"end" in item ? item.end : false}
          className={({ isActive }) =>
            `text-sm font-medium transition ${
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
