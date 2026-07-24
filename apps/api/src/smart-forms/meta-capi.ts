import { createHash } from "node:crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizePhone(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (!d.startsWith("55") && d.length <= 11) d = `55${d}`;
  return d;
}

export type FormCapiInput = {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  lead: {
    id: string;
    email?: string | null;
    phone?: string | null;
    fullName?: string | null;
    eventSourceUrl?: string | null;
    clientIp?: string | null;
    userAgent?: string | null;
    fbclid?: string | null;
  };
  eventName?: string;
};

export async function sendFormMetaCapi(input: FormCapiInput) {
  const userData: Record<string, unknown> = {};
  if (input.lead.email) userData.em = [sha256(input.lead.email)];
  if (input.lead.phone) userData.ph = [sha256(normalizePhone(input.lead.phone))];
  if (input.lead.fullName) {
    const parts = input.lead.fullName.trim().split(/\s+/);
    if (parts[0]) userData.fn = [sha256(parts[0])];
    if (parts.length > 1) userData.ln = [sha256(parts[parts.length - 1])];
  }
  if (input.lead.clientIp) userData.client_ip_address = input.lead.clientIp;
  if (input.lead.userAgent) userData.client_user_agent = input.lead.userAgent;
  if (input.lead.fbclid) {
    userData.fbc = `fb.1.${Math.floor(Date.now() / 1000)}.${input.lead.fbclid}`;
  }

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName || "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `sf_${input.lead.id}`,
        action_source: "website",
        event_source_url: input.lead.eventSourceUrl || undefined,
        user_data: userData,
        custom_data: {
          content_name: "smart_form_lead",
          content_category: "smart_forms",
        },
      },
    ],
  };
  if (input.testEventCode) {
    payload.test_event_code = input.testEventCode;
  }

  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(input.pixelId)}/events?access_token=${encodeURIComponent(input.accessToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Meta CAPI HTTP ${res.status}: ${JSON.stringify(body)}`);
  }
  return { ok: true as const, body };
}
