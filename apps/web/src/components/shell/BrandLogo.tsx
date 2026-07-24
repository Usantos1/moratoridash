import { Link } from "react-router-dom";

export function BrandLogo({
  className = "",
  to = "/admin",
}: {
  className?: string;
  to?: string;
}) {
  return (
    <Link to={to} className={`flex min-w-0 items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
        M
      </span>
      <span className="hidden min-w-0 sm:block">
        <span className="block truncate text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Muratori
        </span>
        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
          Dash
        </span>
      </span>
    </Link>
  );
}
