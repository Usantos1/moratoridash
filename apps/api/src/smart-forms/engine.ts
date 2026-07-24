import {
  isDisplayOnly,
  isTerminal,
  type AnswerValue,
  type SmartFormCondition,
  type SmartFormDefinition,
  type SmartFormNode,
  type SmartFormOption,
  type Temperature,
} from "./types";
import { findNode } from "./definition";

export type TemperatureThresholds = {
  scoreColdMax: number;
  scoreWarmMax: number;
  scoreHotMax: number;
};

export function temperatureFromScore(score: number, t: TemperatureThresholds): Temperature {
  if (score <= t.scoreColdMax) return "COLD";
  if (score <= t.scoreWarmMax) return "WARM";
  if (score <= t.scoreHotMax) return "HOT";
  return "VERY_HOT";
}

function matchCondition(
  cond: SmartFormCondition,
  answers: Record<string, AnswerValue>,
  score: number,
  tags: string[]
): boolean {
  const { op, field, value } = cond;
  if (op === "score_gte") return score >= Number(value);
  if (op === "score_lte") return score <= Number(value);
  if (op === "has_tag") return tags.includes(String(value));

  const current = field ? answers[field] : undefined;
  switch (op) {
    case "eq":
      return current === value || String(current) === String(value);
    case "neq":
      return current !== value && String(current) !== String(value);
    case "contains":
      return String(current ?? "").includes(String(value ?? ""));
    case "gt":
      return Number(current) > Number(value);
    case "gte":
      return Number(current) >= Number(value);
    case "lt":
      return Number(current) < Number(value);
    case "lte":
      return Number(current) <= Number(value);
    case "in":
      return Array.isArray(value) && value.map(String).includes(String(current));
    case "not_in":
      return Array.isArray(value) && !value.map(String).includes(String(current));
    default:
      return false;
  }
}

function selectedOptions(node: SmartFormNode, answer: AnswerValue): SmartFormOption[] {
  if (!node.options?.length || answer == null) return [];
  const values = Array.isArray(answer) ? answer.map(String) : [String(answer)];
  return node.options.filter(
    (o) => values.includes(o.value) || values.includes(o.id) || values.includes(o.label)
  );
}

export function resolveNextNodeId(
  def: SmartFormDefinition,
  fromNodeId: string,
  answer: AnswerValue,
  answers: Record<string, AnswerValue>,
  score: number,
  tags: string[]
): string | null {
  const node = findNode(def, fromNodeId);
  if (!node) return null;

  const picked = selectedOptions(node, answer).find((o) => o.nextNodeId);
  if (picked?.nextNodeId && findNode(def, picked.nextNodeId)) {
    return picked.nextNodeId;
  }

  const edges = def.edges.filter((e) => e.from === fromNodeId);
  for (const edge of edges) {
    if (edge.condition && matchCondition(edge.condition, answers, score, tags)) {
      return edge.to;
    }
  }
  const fallback = edges.find((e) => !e.condition);
  if (fallback) return fallback.to;

  const idx = def.nodes.findIndex((n) => n.id === fromNodeId);
  if (idx >= 0 && idx + 1 < def.nodes.length) return def.nodes[idx + 1].id;
  return null;
}

/** Avança automaticamente por nós `message` no server. */
export function advancePastDisplayNodes(
  def: SmartFormDefinition,
  nodeId: string | null,
  answers: Record<string, AnswerValue>,
  score: number,
  tags: string[]
): string | null {
  let current = nodeId;
  let guard = 0;
  while (current && guard < 50) {
    guard += 1;
    const node = findNode(def, current);
    if (!node) return null;
    if (node.type !== "message") return current;
    const next = resolveNextNodeId(def, current, null, answers, score, tags);
    if (!next || next === current) return current;
    current = next;
  }
  return current;
}

export function validateNodeAnswer(
  node: SmartFormNode,
  answer: AnswerValue
): { ok: true; value: AnswerValue } | { ok: false; error: string } {
  if (isDisplayOnly(node.type)) {
    return { ok: true, value: null };
  }

  const required = node.required !== false;
  const err = node.errorMessage || "Resposta inválida";

  if (node.type === "multiple_choice") {
    const arr = Array.isArray(answer) ? answer : answer == null ? [] : [String(answer)];
    if (required && arr.length < 1) return { ok: false, error: err };
    return { ok: true, value: arr.map(String) };
  }

  if (node.type === "lgpd") {
    const ok =
      answer === true ||
      answer === "true" ||
      answer === "1" ||
      String(answer).toLowerCase() === "sim";
    if (required && !ok) return { ok: false, error: err };
    return { ok: true, value: ok };
  }

  if (["number", "scale", "rating"].includes(node.type)) {
    const n = typeof answer === "number" ? answer : Number(answer);
    if (!Number.isFinite(n)) return { ok: false, error: err };
    if (node.validation?.min != null && n < node.validation.min) return { ok: false, error: err };
    if (node.validation?.max != null && n > node.validation.max) return { ok: false, error: err };
    return { ok: true, value: n };
  }

  if (node.type === "email") {
    const s = String(answer ?? "").trim();
    if (required && !s) return { ok: false, error: err };
    if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return { ok: false, error: err };
    return { ok: true, value: s };
  }

  if (node.type === "phone") {
    const digits = String(answer ?? "").replace(/\D/g, "");
    if (required && digits.length < 10) return { ok: false, error: err };
    if (digits && (digits.length < 10 || digits.length > 13)) return { ok: false, error: err };
    return { ok: true, value: digits };
  }

  if (node.type === "cpf") {
    const digits = String(answer ?? "").replace(/\D/g, "");
    if (required && digits.length !== 11) return { ok: false, error: err };
    if (digits && digits.length !== 11) return { ok: false, error: err };
    return { ok: true, value: digits };
  }

  if (node.type === "cnpj") {
    const digits = String(answer ?? "").replace(/\D/g, "");
    if (required && digits.length !== 14) return { ok: false, error: err };
    if (digits && digits.length !== 14) return { ok: false, error: err };
    return { ok: true, value: digits };
  }

  if (node.type === "single_choice" || node.type === "buttons") {
    const s = String(answer ?? "");
    if (required && !s) return { ok: false, error: err };
    if (s && node.options?.length) {
      const ok = node.options.some(
        (o) => o.value === s || o.id === s || o.label === s
      );
      if (!ok) return { ok: false, error: err };
    }
    return { ok: true, value: s };
  }

  const s = answer == null ? "" : String(answer);
  if (required && !s.trim()) return { ok: false, error: err };
  const v = node.validation;
  if (v?.minLength != null && s.length < v.minLength) return { ok: false, error: err };
  if (v?.maxLength != null && s.length > v.maxLength) return { ok: false, error: err };
  if (v?.pattern) {
    try {
      if (!new RegExp(v.pattern).test(s)) return { ok: false, error: err };
    } catch {
      return { ok: false, error: err };
    }
  }
  return { ok: true, value: s };
}

export function scoreAndTagsForAnswer(node: SmartFormNode, answer: AnswerValue) {
  let delta = node.scoreDelta || 0;
  const tags = [...(node.tags || [])];
  for (const opt of selectedOptions(node, answer)) {
    delta += opt.scoreDelta || 0;
    if (opt.tags) tags.push(...opt.tags);
  }
  return { delta, tags: [...new Set(tags)] };
}

export function applyMapTo(
  mapTo: string | undefined,
  answer: AnswerValue,
  node: SmartFormNode,
  lead: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    companyName?: string | null;
    customFields: Record<string, { label: string; value: unknown }>;
  },
  labels?: Record<string, string>
) {
  if (!mapTo || answer == null) return;
  if (mapTo === "fullName") lead.fullName = String(answer).slice(0, 200);
  else if (mapTo === "email") lead.email = String(answer).slice(0, 320);
  else if (mapTo === "phone") lead.phone = String(answer).replace(/\D/g, "").slice(0, 32);
  else if (mapTo === "companyName") lead.companyName = String(answer).slice(0, 200);
  else if (mapTo.startsWith("custom:")) {
    const key = mapTo.slice(7).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 48);
    if (!key) return;
    lead.customFields[key] = {
      label: labels?.[key] || node.title || key,
      value: typeof answer === "string" ? answer.slice(0, 500) : answer,
    };
  }
}

export function interpolateVars(
  template: string | undefined | null,
  vars: Record<string, string>
): string {
  if (!template) return "";
  return template
    .replace(/\{\{\s*br\s*\}\}/gi, "\n")
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function buildVarsFromLead(input: {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  answers: Record<string, AnswerValue>;
  customFields?: Record<string, { label: string; value: unknown }>;
}): Record<string, string> {
  const vars: Record<string, string> = {
    fullName: input.fullName || "",
    nome: input.fullName || "",
    email: input.email || "",
    phone: input.phone || "",
    telefone: input.phone || "",
    whatsapp: input.phone || "",
    companyName: input.companyName || "",
    empresa: input.companyName || "",
  };
  for (const [k, v] of Object.entries(input.answers || {})) {
    vars[k] = v == null ? "" : Array.isArray(v) ? v.join(", ") : String(v);
    vars[`answer.${k}`] = vars[k];
  }
  for (const [k, v] of Object.entries(input.customFields || {})) {
    vars[`custom.${k}`] = v?.value == null ? "" : String(v.value);
  }
  return vars;
}

export function toPublicNode(node: SmartFormNode) {
  return {
    id: node.id,
    type: node.type,
    title: node.title ?? null,
    description: node.description ?? null,
    placeholder: node.placeholder ?? null,
    mapTo: node.mapTo ?? null,
    required: node.required !== false && !isDisplayOnly(node.type),
    options: (node.options || []).map((o) => ({
      id: o.id,
      label: o.label,
      value: o.value,
    })),
    validation: node.validation ?? null,
    mask: node.mask ?? null,
    ...(isTerminal(node.type)
      ? {
          redirectUrl: node.redirectUrl ?? null,
          redirectDelayMs: node.redirectDelayMs ?? null,
          bannerText: node.bannerText ?? null,
          notifyTeam: node.notifyTeam !== false,
          trackPaidConversion:
            node.trackPaidConversion !== undefined
              ? node.trackPaidConversion
              : node.notifyTeam !== false,
        }
      : {}),
    ...(["message", "confirmation"].includes(node.type)
      ? {
          mediaUrl: node.mediaUrl ?? null,
          mediaType: node.mediaType ?? null,
          mediaName: node.mediaName ?? null,
        }
      : {}),
    isTerminal: isTerminal(node.type),
    isDisplayOnly: isDisplayOnly(node.type),
  };
}
