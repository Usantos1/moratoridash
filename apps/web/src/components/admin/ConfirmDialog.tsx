import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminButton } from "./ui";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Pending = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm precisa estar dentro de ConfirmProvider");
  return fn;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  function close(result: boolean) {
    pendingRef.current?.resolve(result);
    pendingRef.current = null;
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [pending]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Cancelar"
            onClick={() => close(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={pending.description ? "confirm-desc" : undefined}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_24px_80px_rgba(16,24,40,0.28)]"
          >
            <div className="px-6 pt-6">
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${
                  pending.danger === false
                    ? "bg-primary/10 text-primary"
                    : "bg-red-50 text-[#ef4444]"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 id="confirm-title" className="text-lg font-bold text-[#1d202b]">
                {pending.title}
              </h2>
              {pending.description && (
                <p id="confirm-desc" className="mt-2 text-sm leading-relaxed text-[#6b7280]">
                  {pending.description}
                </p>
              )}
            </div>
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#eef0f4] px-6 py-4">
              <AdminButton
                variant="ghost"
                className="!px-4 !py-2 text-sm"
                onClick={() => close(false)}
              >
                {pending.cancelLabel || "Cancelar"}
              </AdminButton>
              <AdminButton
                variant={pending.danger === false ? "primary" : "danger"}
                className="!px-4 !py-2 text-sm"
                onClick={() => close(true)}
                autoFocus
              >
                {pending.confirmLabel || "Confirmar"}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
