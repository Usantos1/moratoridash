const TOKEN_KEY = "muratori_admin_token";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    adminFetch<{ token: string; user: { id: string; email: string; name: string | null; role: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  me: () => adminFetch<{ user: { id: string; email: string; name: string | null; role: string } }>("/api/auth/me"),
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
};
