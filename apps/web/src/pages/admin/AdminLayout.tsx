import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { adminApi, getAdminToken, setAdminToken } from "../../lib/admin-api";
import { AppShell } from "../../components/shell/AppShell";
import { FormsModuleNav } from "../../components/admin/FormsModuleNav";

export function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      navigate("/admin/login");
      return;
    }
    adminApi
      .me()
      .then((res) => {
        setUser(res.user);
        setReady(true);
      })
      .catch(() => {
        setAdminToken(null);
        navigate("/admin/login");
      });
  }, [navigate]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f1f3f6] text-muted-foreground">
        <div className="text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Muratori
          </div>
          <div className="mt-1 text-lg font-bold tracking-tight text-foreground">Dash</div>
          <p className="mt-2 text-sm">Abrindo o painel…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      user={user}
      onLogout={() => {
        setAdminToken(null);
        navigate("/admin/login");
      }}
    >
      <FormsModuleNav />
      <Outlet />
    </AppShell>
  );
}
