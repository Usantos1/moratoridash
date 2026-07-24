import { env } from "../config/env";

export type InternalAlertPayload = {
  event: string;
  leadId?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  attendants?: number | null;
  clientsPerDay?: number | null;
  revenueLabel?: string;
  responseLabel?: string;
  niches?: string[];
  sourcePage?: string | null;
  path?: string;
  isQualified?: boolean | null;
};

/** Webhook interno opcional — falha nunca quebra o fluxo */
export async function sendInternalAlert(payload: InternalAlertPayload): Promise<void> {
  const url = env.INTERNAL_WEBHOOK_URL?.trim();
  if (!url) {
    console.log("[alert]", payload.event, payload.leadId || payload.email);
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        at: new Date().toISOString(),
        source: "muratori-dash",
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (error) {
    console.error("[alert] falhou", error instanceof Error ? error.message : error);
  }
}
