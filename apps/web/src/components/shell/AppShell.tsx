import type { ReactNode } from "react";
import { AppTopbar } from "./AppTopbar";

type Props = {
  user: { email: string; name: string | null };
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({ user, onLogout, children }: Props) {
  return (
    <div className="min-h-dvh bg-background bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,hsl(var(--primary)/0.07),transparent_52%)]">
      <AppTopbar user={user} onLogout={onLogout} />
      <main
        className="mx-auto w-full max-w-6xl px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 md:px-5"
        style={{
          paddingTop: "calc(1rem + 4.5rem + env(safe-area-inset-top))",
        }}
      >
        {children}
      </main>
    </div>
  );
}
