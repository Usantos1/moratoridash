import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminPanel({
  children,
  className = "",
  title,
  subtitle,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden border border-white/[0.08] bg-[linear-gradient(160deg,rgba(14,22,20,0.95),rgba(8,14,12,0.88))] p-5 sm:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--leaf)]/40 to-transparent" />
      {(title || subtitle) && (
        <header className="mb-5">
          {title ? <h2 className="font-display text-xl font-bold text-white">{title}</h2> : null}
          {subtitle ? <p className="mt-1 text-xs text-white/45">{subtitle}</p> : null}
        </header>
      )}
      {children}
    </section>
  );
}

export function AdminStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="anim-rise group relative overflow-hidden border border-white/[0.08] bg-[#0c1412]/90 p-4">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-[var(--leaf)]/80 transition group-hover:bg-[var(--leaf)]" />
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold text-[var(--leaf)]">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/35">{hint}</div> : null}
    </div>
  );
}

export function AdminBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger" | "live";
}) {
  const tones = {
    neutral: "bg-white/8 text-white/60",
    success: "bg-emerald-500/15 text-emerald-300",
    warn: "bg-orange-500/15 text-orange-300",
    danger: "bg-rose-500/15 text-rose-300",
    live: "bg-[var(--leaf)]/15 text-[var(--leaf)]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function AdminButton({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-[var(--leaf)] text-[#0a140f] hover:brightness-110 disabled:opacity-50",
    ghost:
      "border border-white/12 bg-transparent text-white/80 hover:border-white/30 hover:text-white disabled:opacity-50",
    danger:
      "border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 disabled:opacity-50",
  };
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold transition ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-white/35">{hint}</span> : null}
    </label>
  );
}

const controlClass =
  "w-full border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[var(--leaf)]/70 focus:bg-black/35";

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${props.className || ""}`} {...props} />;
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} ${props.className || ""}`} {...props} />;
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${props.className || ""}`} {...props} />;
}
