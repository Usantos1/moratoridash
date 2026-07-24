import { useCallback } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { getAdminToken, setAdminToken } from "../../lib/admin-api";
import { SessionProvider } from "../../lib/session-context";
import { AppShell } from "../../components/shell/AppShell";

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f1f3f6] text-muted-foreground">
      <div className="text-center">
        <div className="text-[17px] font-extrabold tracking-tight">
          <span className="text-brand-600">MURATORI</span>{" "}
          <span className="text-primary">DASH</span>
        </div>
        <p className="mt-2 text-sm">{message}</p>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();

  const logout = useCallback(() => {
    setAdminToken(null);
    navigate("/admin/login");
  }, [navigate]);

  if (!getAdminToken()) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <SessionProvider
      onUnauthenticated={logout}
      fallback={<LoadingScreen message="Abrindo o painel…" />}
    >
      <AppShell onLogout={logout}>
        <Outlet />
      </AppShell>
    </SessionProvider>
  );
}
