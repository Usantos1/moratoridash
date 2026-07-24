import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { adminApi } from "./admin-api";
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  type SessionUser,
  type WorkspaceSummary,
} from "./session";

type SessionContextValue = {
  user: SessionUser;
  workspaces: WorkspaceSummary[];
  workspace: WorkspaceSummary | null;
  permissions: string[];
  can: (permission: string) => boolean;
  switchWorkspace: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession precisa estar dentro de SessionProvider");
  return value;
}

/// Permissões do workspace ativo; superadmin sempre passa.
export function useCan(): (permission: string) => boolean {
  return useSession().can;
}

type ProviderProps = {
  children: React.ReactNode;
  onUnauthenticated: () => void;
  fallback: React.ReactNode;
};

export function SessionProvider({ children, onUnauthenticated, fallback }: ProviderProps) {
  const [state, setState] = useState<{
    user: SessionUser;
    workspaces: WorkspaceSummary[];
    activeWorkspaceId: string | null;
    permissions: string[];
  } | null>(null);

  const load = useCallback(async () => {
    const res = await adminApi.me();
    const activeId =
      res.workspaces.find((item) => item.id === getActiveWorkspaceId())?.id ??
      res.activeWorkspaceId ??
      res.workspaces[0]?.id ??
      null;
    setActiveWorkspaceId(activeId);
    const active = res.workspaces.find((item) => item.id === activeId) ?? null;
    setState({
      user: res.user,
      workspaces: res.workspaces,
      activeWorkspaceId: activeId,
      permissions: active?.permissions ?? res.permissions,
    });
  }, []);

  useEffect(() => {
    load().catch(() => onUnauthenticated());
  }, [load, onUnauthenticated]);

  const switchWorkspace = useCallback(
    async (id: string) => {
      setActiveWorkspaceId(id);
      await load();
    },
    [load]
  );

  const value = useMemo<SessionContextValue | null>(() => {
    if (!state) return null;
    const workspace = state.workspaces.find((item) => item.id === state.activeWorkspaceId) ?? null;
    const isSuperAdmin = state.user.role === "superadmin";
    return {
      user: state.user,
      workspaces: state.workspaces,
      workspace,
      permissions: state.permissions,
      can: (permission: string) => isSuperAdmin || state.permissions.includes(permission),
      switchWorkspace,
      reload: load,
    };
  }, [state, switchWorkspace, load]);

  if (!value) return <>{fallback}</>;

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
