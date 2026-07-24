import type {
  SmartFormDefinition,
  SmartFormNode,
  SmartFormOption,
} from "./types";

export type DraftAnswer = string | number | boolean | string[] | null;

const DISPLAY = new Set(["message", "confirmation", "redirect"]);
const TERMINAL = new Set(["confirmation", "redirect"]);

export function isDisplayOnly(type: string) {
  return DISPLAY.has(type);
}

export function isTerminal(type: string) {
  return TERMINAL.has(type);
}

function findNode(def: SmartFormDefinition, id: string | null | undefined) {
  if (!id) return null;
  return def.nodes.find((n) => n.id === id) || null;
}

function selectedOptions(node: SmartFormNode, answer: DraftAnswer): SmartFormOption[] {
  if (!node.options?.length || answer == null) return [];
  const values = Array.isArray(answer) ? answer.map(String) : [String(answer)];
  return node.options.filter(
    (o) => values.includes(o.value) || values.includes(o.id) || values.includes(o.label)
  );
}

export function resolveNext(
  def: SmartFormDefinition,
  fromId: string,
  answer: DraftAnswer,
  score: number,
  tags: string[]
): string | null {
  const node = findNode(def, fromId);
  if (!node) return null;
  const picked = selectedOptions(node, answer).find((o) => o.nextNodeId);
  if (picked?.nextNodeId && findNode(def, picked.nextNodeId)) return picked.nextNodeId;

  const edges = def.edges.filter((e) => e.from === fromId);
  for (const edge of edges) {
    const c = edge.condition;
    if (!c) continue;
    if (c.op === "score_gte" && score >= Number(c.value)) return edge.to;
    if (c.op === "score_lte" && score <= Number(c.value)) return edge.to;
    if (c.op === "has_tag" && tags.includes(String(c.value))) return edge.to;
    const current = c.field ? undefined : undefined;
    void current;
    const fieldVal = c.field ? undefined : undefined;
    void fieldVal;
    // simple eq on answer for same node
    if (c.op === "eq" && c.field === fromId && String(answer) === String(c.value)) {
      return edge.to;
    }
  }
  const fallback = edges.find((e) => !e.condition);
  if (fallback) return fallback.to;
  const idx = def.nodes.findIndex((n) => n.id === fromId);
  if (idx >= 0 && idx + 1 < def.nodes.length) return def.nodes[idx + 1].id;
  return null;
}

export function advancePastMessages(
  def: SmartFormDefinition,
  nodeId: string | null,
  score: number,
  tags: string[]
): string | null {
  let current = nodeId;
  let guard = 0;
  while (current && guard < 40) {
    guard += 1;
    const node = findNode(def, current);
    if (!node) return null;
    if (node.type !== "message") return current;
    const next = resolveNext(def, current, null, score, tags);
    if (!next || next === current) return current;
    current = next;
  }
  return current;
}

export function scoreDelta(node: SmartFormNode, answer: DraftAnswer) {
  let delta = node.scoreDelta || 0;
  const tags = [...(node.tags || [])];
  for (const opt of selectedOptions(node, answer)) {
    delta += opt.scoreDelta || 0;
    if (opt.tags) tags.push(...opt.tags);
  }
  return { delta, tags: [...new Set(tags)] };
}

export type DraftSession = {
  currentNodeId: string | null;
  answers: Record<string, DraftAnswer>;
  score: number;
  tags: string[];
  completed: boolean;
  transcript: Array<{ role: "bot" | "user"; text: string; nodeId?: string }>;
};

export function startDraft(def: SmartFormDefinition): DraftSession {
  const start = advancePastMessages(def, def.startNodeId, 0, []) || def.startNodeId;
  const node = findNode(def, start);
  const transcript: DraftSession["transcript"] = [];
  if (node) {
    transcript.push({
      role: "bot",
      text: [node.title, node.description].filter(Boolean).join("\n"),
      nodeId: node.id,
    });
  }
  return {
    currentNodeId: start,
    answers: {},
    score: 0,
    tags: [],
    completed: Boolean(node && isTerminal(node.type)),
    transcript,
  };
}

export function answerDraft(
  def: SmartFormDefinition,
  session: DraftSession,
  answer: DraftAnswer
): DraftSession {
  if (session.completed || !session.currentNodeId) return session;
  const node = findNode(def, session.currentNodeId);
  if (!node) return session;

  const answers = { ...session.answers, [node.id]: answer };
  const { delta, tags: newTags } = scoreDelta(node, answer);
  const score = session.score + delta;
  const tags = [...new Set([...session.tags, ...newTags])];

  const transcript = [...session.transcript];
  if (!isDisplayOnly(node.type) && answer != null && answer !== "") {
    const label = Array.isArray(answer)
      ? answer.join(", ")
      : typeof answer === "boolean"
        ? answer
          ? "Sim"
          : "Não"
        : String(answer);
    transcript.push({ role: "user", text: label });
  }

  if (isTerminal(node.type)) {
    return {
      ...session,
      answers,
      score,
      tags,
      completed: true,
      transcript,
    };
  }

  let nextId = resolveNext(def, node.id, answer, score, tags);
  nextId = advancePastMessages(def, nextId, score, tags);

  // collect message nodes skipped? advancePastMessages skips messages without adding - for simulator add them
  // simpler: just show next node
  const next = findNode(def, nextId);
  if (next) {
    transcript.push({
      role: "bot",
      text: [next.title, next.description].filter(Boolean).join("\n"),
      nodeId: next.id,
    });
  }

  const completed = !nextId || Boolean(next && isTerminal(next.type));
  return {
    currentNodeId: nextId,
    answers,
    score,
    tags,
    completed,
    transcript,
  };
}

export function currentNode(def: SmartFormDefinition, session: DraftSession) {
  return findNode(def, session.currentNodeId);
}
