import type { ReactNode } from "react";
import { AppTopbar } from "./AppTopbar";

type Props = {
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({ onLogout, children }: Props) {
  return (
    <div className="min-h-dvh bg-canvas">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[42vh]"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -20%, hsl(var(--primary) / 0.07), transparent 52%)",
        }}
      />
      <AppTopbar onLogout={onLogout} />
      <main
        className="relative w-full px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 md:px-5"
        style={{
          paddingTop: "calc(1rem + 4.5rem + env(safe-area-inset-top))",
        }}
      >
        {children}
      </main>
    </div>
  );
}
