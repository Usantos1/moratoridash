import { getAdminToken } from "./admin-api";
import type { FormSettings, SmartFormDefinition, SmartFormRecord } from "./smart-forms/types";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

async function sfFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (res.status === 204) return {} as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || res.statusText) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const smartFormsApi = {
  list: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params);
    return sfFetch<{
      items: SmartFormRecord[];
      total: number;
      page: number;
      pageSize: number;
      pages: number;
    }>(`/api/forms?${q}`);
  },
  get: (id: string) => sfFetch<SmartFormRecord>(`/api/forms/${id}`),
  create: (body: {
    name: string;
    description?: string;
    slug?: string;
    draftDefinition?: SmartFormDefinition;
    templateId?: string;
  }) =>
    sfFetch<SmartFormRecord>("/api/forms", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (
    id: string,
    body: Partial<{
      name: string;
      description: string | null;
      slug: string;
      draftDefinition: SmartFormDefinition;
      settings: FormSettings;
      scoreColdMax: number;
      scoreWarmMax: number;
      scoreHotMax: number;
      aiSystemPrompt: string | null;
      aiEnabled: boolean;
      crmSyncEnabled: boolean;
      status: "DRAFT" | "ARCHIVED";
    }>
  ) =>
    sfFetch<SmartFormRecord>(`/api/forms/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  publish: (id: string, note?: string) =>
    sfFetch<SmartFormRecord>(`/api/forms/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
  duplicate: (id: string) =>
    sfFetch<SmartFormRecord>(`/api/forms/${id}/duplicate`, { method: "POST" }),
  remove: (id: string) =>
    sfFetch<{ ok: boolean }>(`/api/forms/${id}`, { method: "DELETE" }),
  templates: () =>
    sfFetch<{ items: Array<Record<string, unknown>> }>("/api/forms/templates"),
  leads: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params);
    return sfFetch<{
      items: Array<Record<string, unknown>>;
      total: number;
      page: number;
      pageSize: number;
      pages: number;
    }>(`/api/forms/leads?${q}`);
  },
  lead: (id: string) => sfFetch<Record<string, unknown>>(`/api/forms/leads/${id}`),
  deleteLead: (id: string) =>
    sfFetch<{ ok: boolean }>(`/api/forms/leads/${id}`, { method: "DELETE" }),
  exportLeadsUrl: (formId?: string) => {
    const q = formId ? `?formId=${encodeURIComponent(formId)}` : "";
    return `${API_BASE}/api/forms/leads/export${q}`;
  },
  dashboard: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params);
    return sfFetch<{
      totals: Record<string, number>;
      series: Array<Record<string, unknown>>;
    }>(`/api/forms/dashboard?${q}`);
  },
  domains: () =>
    sfFetch<{ items: Array<Record<string, unknown>> }>("/api/forms/domains"),
  addDomain: (hostname: string, formId?: string) =>
    sfFetch("/api/forms/domains", {
      method: "POST",
      body: JSON.stringify({ hostname, formId }),
    }),
  deleteDomain: (id: string) =>
    sfFetch(`/api/forms/domains/${id}`, { method: "DELETE" }),
};
