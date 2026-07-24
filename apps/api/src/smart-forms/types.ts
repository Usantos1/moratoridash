import { randomBytes } from "node:crypto";

export const SMART_FORM_BLOCK_TYPES = [
  "message",
  "question",
  "buttons",
  "text",
  "number",
  "phone",
  "email",
  "cpf",
  "cnpj",
  "city",
  "state",
  "date",
  "time",
  "file",
  "image",
  "video",
  "audio",
  "single_choice",
  "multiple_choice",
  "scale",
  "rating",
  "confirmation",
  "lgpd",
  "redirect",
] as const;

export type SmartFormBlockType = (typeof SMART_FORM_BLOCK_TYPES)[number];

export type SmartFormStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type Temperature = "COLD" | "WARM" | "HOT" | "VERY_HOT";
export type LeadStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "DISQUALIFIED";
export type AnswerValue = string | number | boolean | string[] | null;

export type SmartFormOption = {
  id: string;
  label: string;
  value: string;
  scoreDelta?: number;
  tags?: string[];
  nextNodeId?: string;
};

export type SmartFormConditionOp =
  | "eq"
  | "neq"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "score_gte"
  | "score_lte"
  | "has_tag";

export type SmartFormCondition = {
  op: SmartFormConditionOp;
  field?: string;
  value?: string | number | boolean | string[];
};

export type SmartFormEdge = {
  id: string;
  from: string;
  to: string;
  condition?: SmartFormCondition;
  label?: string;
};

export type SmartFormNodeEvent = {
  id: string;
  provider: string;
  eventName: string;
  trigger: "start" | "answer" | "button_click" | "complete" | "abandon";
  params?: Record<string, unknown>;
  value?: number;
  currency?: string;
};

export type SmartFormNode = {
  id: string;
  type: SmartFormBlockType | string;
  internalName?: string;
  title?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  mask?: string;
  errorMessage?: string;
  scoreDelta?: number;
  tags?: string[];
  options?: SmartFormOption[];
  events?: SmartFormNodeEvent[];
  redirectUrl?: string;
  redirectDelayMs?: number;
  bannerText?: string;
  notifyTeam?: boolean;
  trackPaidConversion?: boolean;
  mapTo?: string;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "pdf";
  mediaName?: string;
};

export type SmartFormDefinition = {
  schemaVersion: 1;
  startNodeId: string;
  nodes: SmartFormNode[];
  edges: SmartFormEdge[];
};

export const DISPLAY_ONLY_TYPES = new Set(["message", "confirmation", "redirect"]);
export const TERMINAL_TYPES = new Set(["confirmation", "redirect"]);

export function isDisplayOnly(type: string) {
  return DISPLAY_ONLY_TYPES.has(type);
}

export function isTerminal(type: string) {
  return TERMINAL_TYPES.has(type);
}

export function emptyDefinition(): SmartFormDefinition {
  return {
    schemaVersion: 1,
    startNodeId: "welcome",
    nodes: [
      {
        id: "welcome",
        type: "message",
        title: "Olá!",
        description: "Vamos fazer um diagnóstico rápido para entender melhor o seu perfil.",
      },
      {
        id: "name",
        type: "text",
        title: "Qual é o seu nome?",
        placeholder: "Seu nome completo",
        required: true,
        mapTo: "fullName",
      },
      {
        id: "thanks",
        type: "confirmation",
        title: "Obrigado!",
        description: "Recebemos suas respostas. Em breve entraremos em contato.",
      },
    ],
    edges: [
      { id: "e1", from: "welcome", to: "name" },
      { id: "e2", from: "name", to: "thanks" },
    ],
  };
}

export function newSessionToken() {
  return randomBytes(32).toString("hex");
}

export const DEFAULT_ORG_ID = "muratori";

export type FormSettings = {
  theme?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  tracking?: Record<string, unknown>;
  webhook?: { enabled?: boolean; url?: string; secret?: string };
  chat?: { messageDelayMs?: number; returnRedirectUrl?: string };
  leadFields?: { customFieldLabels?: Record<string, string> };
};
