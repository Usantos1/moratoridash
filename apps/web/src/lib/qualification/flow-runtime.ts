import {
  ATTENDANT_OPTIONS,
  CLIENTS_OPTIONS,
  LOW_REVENUE,
  NICHES,
  REVENUE_OPTIONS,
  RESPONSE_OPTIONS,
  STEPS,
  botQuestion,
  firstName,
  type ChatStep,
  type FormData,
} from "./types";

export type FlowStepType =
  | "text"
  | "email"
  | "phone_br"
  | "number_or_choice"
  | "multi_choice"
  | "single_choice_cards"
  | "system_report";

export type FlowStepDef = {
  key: string;
  type: FlowStepType | string;
  field_key: string | null;
  required?: boolean;
  bot_text?: string;
  error?: string;
  options?: string[] | Array<{ value: string; label: string; emoji?: string }>;
};

export type FlowBranchRule = {
  when?: { field?: string; in?: string[] };
  then?: { offer?: string; cta?: string };
  else?: { offer?: string; cta?: string };
};

export type FlowDefinition = {
  version?: number;
  name?: string;
  segment?: string;
  brandVars?: { assistantLabel?: string };
  steps: FlowStepDef[];
  branching?: FlowBranchRule[];
  diagnosis_preset?: string;
};

const POST_RESULT: ChatStep[] = ["offer_ask", "offer_detail", "offer_done"];

/** Converte definição da API (ou preset) num objeto usable no chat. */
export function normalizeFlowDefinition(raw: unknown): FlowDefinition {
  if (!raw || typeof raw !== "object") {
    return { version: 1, name: "default", steps: [] };
  }
  const d = raw as Record<string, unknown>;
  const steps = Array.isArray(d.steps) ? (d.steps as FlowStepDef[]) : [];
  return {
    version: typeof d.version === "number" ? d.version : 1,
    name: typeof d.name === "string" ? d.name : "default",
    segment: typeof d.segment === "string" ? d.segment : undefined,
    brandVars:
      d.brandVars && typeof d.brandVars === "object"
        ? (d.brandVars as FlowDefinition["brandVars"])
        : undefined,
    steps: steps.filter((s) => s && typeof s.key === "string"),
    branching: Array.isArray(d.branching) ? (d.branching as FlowBranchRule[]) : [],
    diagnosis_preset:
      typeof d.diagnosis_preset === "string" ? d.diagnosis_preset : undefined,
  };
}

export function getQuestionSteps(flow: FlowDefinition | null): ChatStep[] {
  if (!flow?.steps?.length) return [...STEPS];
  const keys = flow.steps
    .filter((s) => s.type !== "system_report")
    .map((s) => s.key)
    .filter((k): k is ChatStep => (STEPS as string[]).includes(k));
  return keys.length ? keys : [...STEPS];
}

export function findFlowStep(flow: FlowDefinition | null, key: string): FlowStepDef | undefined {
  return flow?.steps.find((s) => s.key === key);
}

export function interpolateFlowText(
  template: string,
  form: FormData,
  brand: string
): string {
  const n = firstName(form.name);
  return template
    .replaceAll("{brand}", brand)
    .replaceAll("{primeiroNome}", n)
    .replaceAll("{nome}", form.name || n)
    .replaceAll("{empresa}", form.company_name || "");
}

export function renderStepBotText(
  flow: FlowDefinition | null,
  step: ChatStep,
  form: FormData,
  brand: string
): string {
  const def = findFlowStep(flow, step);
  if (def?.bot_text) {
    return interpolateFlowText(def.bot_text, form, brand);
  }
  return botQuestion(step, form, brand);
}

export function getNextQuestionStep(
  flow: FlowDefinition | null,
  fromStep: ChatStep
): ChatStep | undefined {
  const steps = getQuestionSteps(flow);
  const idx = steps.indexOf(fromStep);
  if (idx < 0) return undefined;
  return steps[idx + 1];
}

export function progressPercent(flow: FlowDefinition | null, step: ChatStep): number {
  const steps = getQuestionSteps(flow);
  const effective: ChatStep = POST_RESULT.includes(step) ? "result" : step;
  // result (system_report) conta como último da barra
  const withResult = flow?.steps?.some((s) => s.key === "result")
    ? [...steps, "result" as ChatStep]
    : [...steps, "result" as ChatStep];
  const unique = [...new Set(withResult)];
  const idx = unique.indexOf(effective === "result" || POST_RESULT.includes(step) ? "result" : step);
  return Math.round(((Math.max(idx, 0) + 1) / unique.length) * 100);
}

/** Resolve branching do JSON: true = mostrar oferta. */
export function shouldShowOfferFromFlow(flow: FlowDefinition | null, form: FormData): boolean {
  const rules = flow?.branching;
  if (!rules?.length) {
    return LOW_REVENUE.includes(form.revenue_level);
  }
  for (const rule of rules) {
    const field = rule.when?.field || "revenue_level";
    const values = rule.when?.in || [];
    const current = String((form as Record<string, unknown>)[field] ?? "");
    const matched = values.length === 0 || values.includes(current);
    const action = matched ? rule.then : rule.else;
    if (action?.offer) return true;
    if (action?.cta === "whatsapp") return false;
  }
  return LOW_REVENUE.includes(form.revenue_level);
}

export function resolveAssistantLabel(
  flow: FlowDefinition | null,
  brand: string,
  fallback: string
): string {
  const tpl = flow?.brandVars?.assistantLabel;
  if (!tpl) return fallback;
  return tpl.replaceAll("{brand}", brand);
}

export function choiceOptionsForStep(
  flow: FlowDefinition | null,
  step: ChatStep
): {
  chips?: string[];
  cards?: Array<{ value: string; label: string; emoji?: string }>;
  niches?: string[];
} {
  const def = findFlowStep(flow, step);
  const raw = def?.options;

  if (step === "niches") {
    if (Array.isArray(raw) && raw.length && typeof raw[0] === "string") {
      return { niches: raw as string[] };
    }
    return { niches: [...NICHES] };
  }

  if (step === "attendants" || step === "clients") {
    if (Array.isArray(raw) && raw.length && typeof raw[0] === "string") {
      return { chips: raw as string[] };
    }
    return {
      chips: step === "attendants" ? [...ATTENDANT_OPTIONS] : [...CLIENTS_OPTIONS],
    };
  }

  if (step === "revenue") {
    if (Array.isArray(raw) && raw.length && typeof raw[0] === "object") {
      return { cards: raw as Array<{ value: string; label: string; emoji?: string }> };
    }
    return { cards: REVENUE_OPTIONS.map((o) => ({ ...o })) };
  }

  if (step === "response") {
    if (Array.isArray(raw) && raw.length && typeof raw[0] === "object") {
      return { cards: raw as Array<{ value: string; label: string; emoji?: string }> };
    }
    return { cards: RESPONSE_OPTIONS.map((o) => ({ ...o })) };
  }

  return {};
}
