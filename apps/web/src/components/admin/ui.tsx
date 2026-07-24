import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { PageHeaderPremium } from "./PageHeaderPremium";

/** @deprecated use PageHeaderPremium — alias para páginas existentes */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return <PageHeaderPremium title={title} description={description} actions={actions} />;
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
      className={`rounded-[var(--radius)] border border-border/70 bg-card p-5 shadow-[var(--shadow-surface-sm)] sm:p-6 ${className}`}
    >
      {(title || subtitle) && (
        <header className="mb-5">
          {title ? <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2> : null}
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
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
    <div className="relative overflow-hidden rounded-[var(--radius)] border border-border/70 bg-card p-4 shadow-[var(--shadow-surface-sm)]">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-primary">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
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
    neutral: "bg-muted text-muted-foreground",
    success: "bg-success/15 text-success",
    warn: "bg-warning/15 text-warning",
    danger: "bg-destructive/15 text-destructive",
    live: "bg-primary/12 text-primary",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
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
      "bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 shadow-sm",
    ghost:
      "border border-border/80 bg-card text-foreground hover:border-primary/35 hover:bg-accent/50 disabled:opacity-50",
    danger:
      "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 disabled:opacity-50",
  };
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${variants[variant]} ${className}`}
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

const controlClass =
  "w-full rounded-[calc(var(--radius)-2px)] border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-ring/25";

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${props.className || ""}`} {...props} />;
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} ${props.className || ""}`} {...props} />;
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${props.className || ""}`} {...props} />;
}
