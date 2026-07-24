import { createHash } from "node:crypto";
import { env } from "../config/env";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizePhone(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (!d.startsWith("55") && d.length <= 11) d = `55${d}`;
  return d;
}

export type ConversionLead = {
  id: string;
  email: string;
  phone: string;
  eventId: string;
  eventSourceUrl?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
};

export async function sendMetaCapi(lead: ConversionLead): Promise<{ ok: boolean; body?: unknown }> {
  const pixelId = env.META_PIXEL_ID?.trim();
  const token = env.META_ACCESS_TOKEN?.trim();
  if (!pixelId || !token) {
    return { ok: false, body: { error: "META_PIXEL_ID/META_ACCESS_TOKEN ausentes" } };
  }

  const userData: Record<string, unknown> = {
    em: [sha256(lead.email)],
    ph: [sha256(normalizePhone(lead.phone))],
  };
  if (lead.fbp) userData.fbp = lead.fbp;
  if (lead.fbc) userData.fbc = lead.fbc;
  if (lead.clientIp) userData.client_ip_address = lead.clientIp;
  if (lead.userAgent) userData.client_user_agent = lead.userAgent;

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: lead.eventId,
        action_source: "website",
        event_source_url: lead.eventSourceUrl || undefined,
        user_data: userData,
        custom_data: {
          content_name: "qualified_diagnostic_lead",
          status: "qualified",
        },
      },
    ],
  };

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Meta CAPI HTTP ${res.status}: ${JSON.stringify(body)}`);
  }
  return { ok: true, body };
}

export async function sendGa4QualifiedLead(lead: ConversionLead): Promise<{ ok: boolean; body?: unknown }> {
  const measurementId = env.GA4_MEASUREMENT_ID?.trim();
  const apiSecret = env.GA4_API_SECRET?.trim();
  if (!measurementId || !apiSecret) {
    return { ok: false, body: { error: "GA4_MEASUREMENT_ID/GA4_API_SECRET ausentes" } };
  }

  const clientId = createHash("sha256").update(lead.id).digest("hex").slice(0, 16);

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
  const payload = {
    client_id: clientId,
    events: [
      {
        name: "qualified_lead",
        params: {
          engagement_time_msec: 1,
          lead_id_hash: createHash("sha256").update(lead.id).digest("hex").slice(0, 16),
          session_id: Date.now().toString(),
        },
      },
    ],
  };

  // Google Ads conversion via GA4 se label configurada
  if (env.GOOGLE_ADS_ID && env.GOOGLE_ADS_CONVERSION_LABEL) {
    (payload.events as Array<Record<string, unknown>>).push({
      name: "conversion",
      params: {
        send_to: `${env.GOOGLE_ADS_ID}/${env.GOOGLE_ADS_CONVERSION_LABEL}`,
        lead_id_hash: createHash("sha256").update(lead.id).digest("hex").slice(0, 16),
      },
    });
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // MP retorna 204 sem body em sucesso
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 MP HTTP ${res.status}: ${text}`);
  }
  return { ok: true, body: { status: res.status } };
}
