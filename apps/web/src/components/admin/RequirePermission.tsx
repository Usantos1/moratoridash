import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../../lib/session-context";
import { AdminPanel } from "./ui";

/// Esconde a rota quando o cargo não tem a permissão; o backend ainda decide.
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { can } = useSession();
  if (can(permission)) return <>{children}</>;

  return (
    <AdminPanel title="Sem acesso">
      <p className="text-sm text-muted-foreground">
        Seu cargo neste workspace não inclui a permissão{" "}
        <span className="font-mono text-xs">{permission}</span>. Fale com um administrador do
        workspace.
      </p>
      <Link to="/admin" className="mt-4 inline-block text-sm font-semibold text-primary">
        Voltar para a dashboard
      </Link>
    </AdminPanel>
  );
}
