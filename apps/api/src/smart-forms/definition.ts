import { z } from "zod";
import {
  SMART_FORM_BLOCK_TYPES,
  emptyDefinition,
  type SmartFormDefinition,
  type SmartFormNode,
} from "./types";

const optionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(200),
  scoreDelta: z.number().int().optional(),
  tags: z.array(z.string().max(64)).max(20).optional(),
  nextNodeId: z.string().max(64).optional(),
});

const conditionSchema = z.object({
  op: z.enum([
    "eq",
    "neq",
    "contains",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "not_in",
    "score_gte",
    "score_lte",
    "has_tag",
  ]),
  field: z.string().max(64).optional(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
});

const edgeSchema = z.object({
  id: z.string().min(1).max(64),
  from: z.string().min(1).max(64),
  to: z.string().min(1).max(64),
  condition: conditionSchema.optional(),
  label: z.string().max(120).optional(),
});

const nodeSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(SMART_FORM_BLOCK_TYPES as unknown as [string, ...string[]]),
  internalName: z.string().max(120).optional(),
  title: z.string().max(300).optional(),
  description: z.string().max(4000).optional(),
  placeholder: z.string().max(200).optional(),
  required: z.boolean().optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().max(200).optional(),
      minLength: z.number().int().optional(),
      maxLength: z.number().int().optional(),
    })
    .optional(),
  mask: z.string().max(80).optional(),
  errorMessage: z.string().max(300).optional(),
  scoreDelta: z.number().int().optional(),
  tags: z.array(z.string().max(64)).max(20).optional(),
  options: z.array(optionSchema).max(50).optional(),
  events: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        provider: z.string().min(1).max(80),
        eventName: z.string().min(1).max(120),
        trigger: z.enum(["start", "answer", "button_click", "complete", "abandon"]),
        params: z.record(z.unknown()).optional(),
        value: z.number().optional(),
        currency: z.string().max(8).optional(),
      })
    )
    .max(20)
    .optional(),
  redirectUrl: z.string().max(4000).optional(),
  redirectDelayMs: z.number().int().min(0).max(60000).optional(),
  bannerText: z.string().max(160).optional(),
  notifyTeam: z.boolean().optional(),
  trackPaidConversion: z.boolean().optional(),
  mapTo: z.string().max(80).optional(),
  mediaUrl: z.string().max(2000).optional(),
  mediaType: z.enum(["image", "audio", "pdf"]).optional(),
  mediaName: z.string().max(200).optional(),
});

export const definitionSchema = z.object({
  schemaVersion: z.literal(1),
  startNodeId: z.string().min(1).max(64),
  nodes: z.array(nodeSchema).min(1).max(200),
  edges: z.array(edgeSchema).max(500),
});

export function parseDefinition(raw: unknown): SmartFormDefinition {
  const parsed = definitionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Definition inválida: ${parsed.error.issues[0]?.message || "erro"}`);
  }
  const def = parsed.data as SmartFormDefinition;
  if (!def.nodes.some((n) => n.id === def.startNodeId)) {
    throw new Error("startNodeId não existe em nodes");
  }
  return def;
}

export function coerceDefinition(raw: unknown): SmartFormDefinition {
  if (!raw || typeof raw !== "object" || !(raw as { nodes?: unknown }).nodes) {
    return emptyDefinition();
  }
  try {
    return parseDefinition(raw);
  } catch {
    return emptyDefinition();
  }
}

export function findNode(def: SmartFormDefinition, id: string | null | undefined): SmartFormNode | null {
  if (!id) return null;
  return def.nodes.find((n) => n.id === id) || null;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
