import {
  setActiveWorkspaceId,
  workspaceHeaders,
  type SessionPayload,
  type WorkspaceSummary,
} from "./session";

const TOKEN_KEY = "muratori_admin_token";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    setActiveWorkspaceId(null);
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...workspaceHeaders(),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const adminApi = {
  login: (email: string, password: string) =>
    adminFetch<SessionPayload & { token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => adminFetch<SessionPayload>("/api/auth/me"),
  workspaces: () => adminFetch<{ items: WorkspaceSummary[] }>("/api/workspaces"),
  permissionCatalog: () =>
    adminFetch<{ groups: Array<{ label: string; items: Array<{ key: string; label: string }> }> }>(
      "/api/workspaces/permissions"
    ),
  createWorkspace: (body: { name: string; slug?: string }) =>
    adminFetch<WorkspaceSummary>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  workspace: (id: string) =>
    adminFetch<{
      id: string;
      slug: string;
      name: string;
      active: boolean;
      createdAt: string;
      _count: { memberships: number; smartForms: number; leads: number };
    }>(`/api/workspaces/${id}`),
  updateWorkspace: (id: string, body: Record<string, unknown>) =>
    adminFetch(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  roles: (workspaceId: string) =>
    adminFetch<{
      items: Array<{
        id: string;
        slug: string;
        name: string;
        description: string | null;
        permissions: string[];
        isSystem: boolean;
        _count: { memberships: number };
      }>;
    }>(`/api/workspaces/${workspaceId}/roles`),
  createRole: (workspaceId: string, body: Record<string, unknown>) =>
    adminFetch(`/api/workspaces/${workspaceId}/roles`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateRole: (workspaceId: string, roleId: string, body: Record<string, unknown>) =>
    adminFetch(`/api/workspaces/${workspaceId}/roles/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteRole: (workspaceId: string, roleId: string) =>
    adminFetch(`/api/workspaces/${workspaceId}/roles/${roleId}`, { method: "DELETE" }),
  members: (workspaceId: string) =>
    adminFetch<{
      items: Array<{
        id: string;
        active: boolean;
        createdAt: string;
        user: { id: string; name: string | null; email: string; role: string; active: boolean };
        role: { id: string; name: string; slug: string } | null;
      }>;
    }>(`/api/workspaces/${workspaceId}/members`),
  addMember: (
    workspaceId: string,
    body: { email: string; name?: string; password?: string; roleId?: string | null }
  ) =>
    adminFetch<{ temporaryPassword: string | null }>(`/api/workspaces/${workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMember: (workspaceId: string, membershipId: string, body: Record<string, unknown>) =>
    adminFetch(`/api/workspaces/${workspaceId}/members/${membershipId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  resetMemberPassword: (workspaceId: string, membershipId: string) =>
    adminFetch<{ temporaryPassword: string }>(
      `/api/workspaces/${workspaceId}/members/${membershipId}/reset-password`,
      { method: "POST" }
    ),
  removeMember: (workspaceId: string, membershipId: string) =>
    adminFetch(`/api/workspaces/${workspaceId}/members/${membershipId}`, { method: "DELETE" }),
  stats: () =>
    adminFetch<{ total: number; completed: number; qualified: number; today: number }>("/api/admin/stats"),
  leads: (params: Record<string, string>) => {
    const q = new URLSearchParams(params);
    return adminFetch<{
      items: Array<Record<string, unknown>>;
      total: number;
      page: number;
      pages: number;
    }>(`/api/admin/leads?${q}`);
  },
  lead: (id: string) => adminFetch<Record<string, unknown>>(`/api/admin/leads/${id}`),
  setLeadStatus: (id: string, status: string) =>
    adminFetch(`/api/admin/leads/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  pages: () => adminFetch<Array<Record<string, unknown>>>("/api/admin/pages"),
  updatePage: (id: string, body: Record<string, unknown>) =>
    adminFetch(`/api/admin/pages/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  duplicatePage: (id: string) =>
    adminFetch(`/api/admin/pages/${id}/duplicate`, { method: "POST" }),
  whatsapp: () => adminFetch<Array<Record<string, unknown>>>("/api/admin/whatsapp-config"),
  saveWhatsapp: (body: Record<string, unknown>) =>
    adminFetch("/api/admin/whatsapp-config", { method: "POST", body: JSON.stringify(body) }),
  offers: () => adminFetch<Array<Record<string, unknown>>>("/api/admin/offers"),
  deliveries: (status?: string) =>
    adminFetch<Array<Record<string, unknown>>>(
      `/api/admin/deliveries${status ? `?status=${status}` : ""}`
    ),
  retryDelivery: (id: string) =>
    adminFetch(`/api/admin/deliveries/${id}/retry`, { method: "POST" }),
  flows: () => adminFetch<Array<Record<string, unknown>>>("/api/admin/flows"),
  saveFlow: (body: { definition: unknown; publish?: boolean; name?: string }) =>
    adminFetch("/api/admin/flows", { method: "POST", body: JSON.stringify(body) }),
  publishFlow: (id: string) =>
    adminFetch(`/api/admin/flows/${id}/publish`, { method: "POST" }),
  settings: () =>
    adminFetch<{
      branding: Record<string, unknown>;
      business: Record<string, unknown>;
      whatsapp: Record<string, unknown>;
      tracking: Record<string, unknown>;
    }>("/api/admin/settings"),
  saveSettings: (body: Record<string, unknown>) =>
    adminFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify(body) }),
};
