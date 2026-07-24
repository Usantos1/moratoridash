import type { FormData, PageConfig } from "./types";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText) as Error & {
      status?: number;
      data?: unknown;
    };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export function getPageConfig(slug = "diagnostico") {
  const hostname = window.location.hostname;
  return request<PageConfig>(
    `/api/config/diagnostic-page?slug=${encodeURIComponent(slug)}&hostname=${encodeURIComponent(hostname)}`
  );
}

/** Marca global da instalação (fallback quando não há page config) */
export function getBrandSettings() {
  return request<{
    brandName: string;
    assistantName: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
    gtmId: string | null;
    ga4MeasurementId: string | null;
    metaPixelId: string | null;
    googleAdsId: string | null;
  }>("/api/config/settings");
}

export function getWhatsappConfig() {
  return request<{ whatsappNumber: string; whatsappMessageTemplate: string | null }>(
    "/api/config/whatsapp"
  );
}

export function checkCompleted(email?: string, phone?: string) {
  const q = new URLSearchParams();
  if (email) q.set("email", email);
  if (phone) q.set("phone", phone);
  return request<{
    completed: boolean;
    name?: string;
    companyName?: string;
    completedAt?: string;
    leadId?: string;
  }>(`/api/leads/check-completed?${q.toString()}`);
}

export function autosaveLead(payload: {
  id?: string;
  form: FormData;
  attribution?: Record<string, string>;
  pageConfigId?: string;
}) {
  const f = payload.form;
  const a = payload.attribution || {};
  return request<{ id: string; created?: boolean; updated?: boolean }>(
    "/api/leads/autosave",
    {
      method: "POST",
      body: JSON.stringify({
        id: payload.id,
        name: f.name,
        email: f.email,
        phone: f.phone,
        companyName: f.company_name,
        numberOfAttendants: f.number_of_attendants
          ? Number(String(f.number_of_attendants).replace("+", ""))
          : null,
        niches: f.niches,
        clientsPerDay: f.clients_per_day
          ? Number(String(f.clients_per_day).replace("+", ""))
          : null,
        revenueLevel: f.revenue_level || null,
        responseTime: f.response_time || null,
        additionalInfo: f.additional_info || null,
        answers: f,
        sourcePage: a.source_page || window.location.pathname,
        landingUrl: a.landing_url,
        referrer: a.referrer,
        hostname: a.hostname,
        utmSource: a.utm_source,
        utmMedium: a.utm_medium,
        utmCampaign: a.utm_campaign,
        utmContent: a.utm_content,
        utmTerm: a.utm_term,
        gclid: a.gclid,
        gbraid: a.gbraid,
        wbraid: a.wbraid,
        fbclid: a.fbclid,
        pageConfigId: payload.pageConfigId,
        segment: "agencia_marketing",
      }),
    }
  );
}

export function completeLead(
  id: string,
  path: "whatsapp" | "checkout" | "offer_view"
) {
  return request<{ id: string; completed: boolean; isQualified: boolean }>(
    "/api/leads/complete",
    {
      method: "POST",
      body: JSON.stringify({ id, path, sourcePage: window.location.pathname }),
    }
  );
}

export function trackWhatsapp(leadId: string, url: string) {
  return request("/api/leads/track-whatsapp", {
    method: "POST",
    body: JSON.stringify({ leadId, url }),
  }).catch(() => null);
}
