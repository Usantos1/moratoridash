export const WORKSPACE_KEY = "muratori_active_workspace";

export type WorkspaceSummary = {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
  active: boolean;
  role: { id: string; slug: string; name: string } | null;
  permissions: string[];
};

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  role: string;
  isSuperAdmin?: boolean;
};

export type SessionPayload = {
  user: SessionUser;
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  permissions: string[];
};

export function getActiveWorkspaceId(): string | null {
  return localStorage.getItem(WORKSPACE_KEY);
}

export function setActiveWorkspaceId(id: string | null) {
  if (!id) localStorage.removeItem(WORKSPACE_KEY);
  else localStorage.setItem(WORKSPACE_KEY, id);
}

export function workspaceHeaders(): Record<string, string> {
  const id = getActiveWorkspaceId();
  return id ? { "X-Workspace-Id": id } : {};
}
