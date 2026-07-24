import { DRAFT_KEY, DRAFT_TTL_MS, type ChatMessage, type ChatStep, type FormData } from "./types";

export type DraftPayload = {
  formData: FormData;
  chatStep: ChatStep;
  messages: ChatMessage[];
  currentLeadId: string | null;
  pendingNiches: string[];
  messageIdCounter: number;
  updatedAt: number;
  attribution?: Record<string, string>;
};

export function loadDraft(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DraftPayload;
    if (!data.updatedAt || Date.now() - data.updatedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveDraft(payload: DraftPayload): void {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...payload, updatedAt: Date.now() })
    );
  } catch {
    // ignore quota
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function captureAttribution(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "gbraid",
    "wbraid",
    "fbclid",
  ];
  const out: Record<string, string> = {
    landing_url: window.location.href,
    referrer: document.referrer || "",
    hostname: window.location.hostname,
    source_page: window.location.pathname,
  };
  for (const key of keys) {
    const v = params.get(key);
    if (v) out[key] = v;
  }
  return out;
}
