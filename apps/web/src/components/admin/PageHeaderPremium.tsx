import type { ReactNode } from "react";

export function PageHeaderPremium({
  eyebrow = "Formulário inteligente",
  title,
  description,
  actions,
  dense,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  dense?: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${dense ? "mb-4" : "mb-6"}`}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/80">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`font-bold tracking-tight text-foreground ${
            dense ? "text-lg sm:text-xl" : "text-2xl sm:text-[1.85rem]"
          }`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
