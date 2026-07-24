import type { ReactNode } from "react";
import { FormsModuleNav } from "./FormsModuleNav";

export function PageHeaderPremium({
  eyebrow = "Formulário inteligente",
  title,
  description,
  actions,
  dense,
  showModuleNav = true,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  dense?: boolean;
  showModuleNav?: boolean;
}) {
  return (
    <div className={`space-y-4 ${dense ? "mb-4" : "mb-6"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/80">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={`font-bold tracking-tight text-foreground ${
              dense ? "text-lg sm:text-xl" : "text-2xl sm:text-[1.85rem]"
            } ${eyebrow ? "mt-1" : ""}`}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          ) : null}
          {showModuleNav ? <FormsModuleNav className="mt-3" /> : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
