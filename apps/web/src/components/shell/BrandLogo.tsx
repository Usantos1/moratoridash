import { Link } from "react-router-dom";

/** Wordmark estilo Ativa: marca + DASH na mesma linha */
export function BrandLogo({
  className = "",
  to = "/admin",
}: {
  className?: string;
  to?: string;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground shadow-sm"
        aria-hidden
      >
        M
      </span>
      <span className="hidden text-[15px] font-bold tracking-tight sm:inline">
        <span className="text-brand-600">MURATORI</span>{" "}
        <span className="text-primary">DASH</span>
      </span>
    </Link>
  );
}
