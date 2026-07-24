import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/admin/forms/dashboard", end: true, label: "Dashboard" },
  { to: "/admin/forms", end: true, label: "Formulários" },
  { to: "/admin/forms/templates", label: "Templates" },
  { to: "/admin/forms/leads", label: "Leads" },
  { to: "/admin/forms/config", label: "Configurações" },
] as const;

export function FormsModuleNav({ className = "" }: { className?: string }) {
  return (
    <nav className={`flex flex-wrap items-center gap-2 ${className}`}>
      {ITEMS.map((item) => (
        <NavLink
          key={item.to + item.label}
          to={item.to}
          end={"end" in item ? item.end : false}
          className={({ isActive }) =>
            `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
