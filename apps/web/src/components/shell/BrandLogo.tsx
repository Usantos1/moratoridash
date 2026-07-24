import { Link } from "react-router-dom";

/** Wordmark: MURATORI em azul + DASH no laranja da marca (#F94C30). */
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
      className={`inline-flex items-baseline gap-1.5 whitespace-nowrap select-none ${className}`}
    >
      <span className="text-[17px] font-extrabold tracking-tight text-brand-600">
        MURATORI
      </span>
      <span className="text-[17px] font-extrabold tracking-tight text-primary">
        DASH
      </span>
    </Link>
  );
}
