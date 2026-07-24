import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { adminApi, getAdminToken, setAdminToken } from "../../lib/admin-api";
import { AppShell } from "../../components/shell/AppShell";

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
          <div className="text-[15px] font-bold tracking-tight">
            <span className="text-brand-600">MURATORI</span>{" "}
            <span className="text-primary">DASH</span>
          </div>
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
      <Outlet />
    </AppShell>
  );
}
