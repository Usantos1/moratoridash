import { NavLink } from "react-router-dom";
import { FORMS_MODULE_NAV, filterNav } from "../../lib/navigation";
import { useCan } from "../../lib/session-context";

export function FormsModuleNav({ className = "" }: { className?: string }) {
  const can = useCan();
  const items = filterNav(FORMS_MODULE_NAV, can);

  return (
    <nav className={`flex flex-wrap items-center gap-2 ${className}`}>
      {items.map((item) => (
        <NavLink
          key={item.to + item.label}
          to={item.to}
          end={item.end ?? false}
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
