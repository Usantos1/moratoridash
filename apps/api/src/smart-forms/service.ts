import type { Prisma } from "@muratori/database";
import { prisma } from "@muratori/database";
import { coerceDefinition, findNode, parseDefinition, slugify } from "./definition";
import {
  advancePastDisplayNodes,
  applyMapTo,
  buildVarsFromLead,
  interpolateVars,
  resolveNextNodeId,
  scoreAndTagsForAnswer,
  temperatureFromScore,
  toPublicNode,
  validateNodeAnswer,
} from "./engine";
import {
  emptyDefinition,
  isTerminal,
  newSessionToken,
  type AnswerValue,
  type FormSettings,
  type SmartFormDefinition,
} from "./types";
import { runPostSubmit } from "./post-submit";
import { absolutizeAssetUrl } from "./assets";

export type { FormSettings };

function asSettings(raw: unknown): FormSettings {
  return (raw && typeof raw === "object" ? raw : {}) as FormSettings;
}

function asAnswers(raw: unknown): Record<string, AnswerValue> {
  return (raw && typeof raw === "object" ? raw : {}) as Record<string, AnswerValue>;
}

function asCustomFields(raw: unknown): Record<string, { label: string; value: unknown }> {
  return (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    { label: string; value: unknown }
  >;
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 80;
}

export async function uniquePublicSlug(base: string) {
  let candidate = slugify(base) || `form-${Date.now().toString(36)}`;
  if (candidate.length < 2) candidate = `f-${Date.now().toString(36)}`;
  let n = 0;
  while (true) {
    const trySlug = n === 0 ? candidate.slice(0, 80) : `${candidate.slice(0, 70)}-${n}`;
    const exists = await prisma.smartForm.findFirst({
      where: { publicSlug: trySlug },
      select: { id: true },
    });
    if (!exists) return trySlug;
    n += 1;
  }
}

export async function uniqueWorkspaceSlug(workspaceId: string, base: string) {
  let candidate = slugify(base) || `form-${Date.now().toString(36)}`;
  if (candidate.length < 2) candidate = `f-${Date.now().toString(36)}`;
  let n = 0;
  while (true) {
    const trySlug = n === 0 ? candidate.slice(0, 80) : `${candidate.slice(0, 70)}-${n}`;
    const exists = await prisma.smartForm.findFirst({
      where: { workspaceId, slug: trySlug, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return trySlug;
    n += 1;
  }
}

async function loadPublishedDefinition(formId: string): Promise<{
  form: NonNullable<Awaited<ReturnType<typeof prisma.smartForm.findFirst>>>;
  definition: SmartFormDefinition;
} | null> {
  const form = await prisma.smartForm.findFirst({
    where: { id: formId, status: "PUBLISHED", deletedAt: null, publishedVersionId: { not: null } },
    include: { publishedVersion: true },
  });
  if (!form?.publishedVersion) return null;
  return {
    form,
    definition: coerceDefinition(form.publishedVersion.definition),
  };
}

async function findPublishedByPublicSlug(publicSlug: string) {
  const form = await prisma.smartForm.findFirst({
    where: {
      publicSlug,
      status: "PUBLISHED",
      deletedAt: null,
      publishedVersionId: { not: null },
    },
    include: { publishedVersion: true },
  });
  if (!form?.publishedVersion) return null;
  return {
    form,
    definition: coerceDefinition(form.publishedVersion.definition),
  };
}

function publicTracking(settings: FormSettings) {
  const t = settings.tracking || {};
  return {
    facebookPixelId: t.facebookPixelId ?? null,
    gtmContainerId: t.gtmContainerId ?? null,
    gaMeasurementId: t.gaMeasurementId ?? null,
    googleAdsId: t.googleAdsId ?? null,
    googleAdsConversionId: t.googleAdsConversionId ?? null,
    googleAdsConversionLabel: t.googleAdsConversionLabel ?? null,
    conversionMinTemperature: t.conversionMinTemperature ?? "ALL",
  };
}

function publicMeta(form: {
  id: string;
  name: string;
  publicSlug: string;
  description: string | null;
  settings: unknown;
}) {
  const settings = asSettings(form.settings);
  const base = (process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");
  const theme = { ...(settings.theme ?? {}) } as Record<string, unknown>;
  if (base) {
    for (const key of ["logoUrl", "chatWallpaperUrl"] as const) {
      const v = theme[key];
      if (typeof v === "string") {
        const abs = absolutizeAssetUrl(v, base);
        if (abs) theme[key] = abs;
      }
    }
  }
  const seo = { ...(settings.seo ?? {}) } as Record<string, unknown>;
  if (base && typeof seo.ogImage === "string") {
    const abs = absolutizeAssetUrl(seo.ogImage, base);
    if (abs) seo.ogImage = abs;
  }
  return {
    formId: form.id,
    name: form.name,
    publicSlug: form.publicSlug,
    description: form.description,
    theme,
    seo,
    tracking: publicTracking(settings),
    chat: {
      messageDelayMs: settings.chat?.messageDelayMs ?? 900,
      returnRedirectUrl: settings.chat?.returnRedirectUrl ?? null,
    },
  };
}

async function buildSessionState(
  session: {
    sessionToken: string;
    status: string;
    score: number;
    currentNodeId: string | null;
    answers: unknown;
    tags: string[];
    completionRedirectUrl: string | null;
    formId: string;
  },
  form: {
    scoreColdMax: number;
    scoreWarmMax: number;
    scoreHotMax: number;
    settings: unknown;
  },
  definition: SmartFormDefinition,
  extras?: { alreadyCompleted?: boolean; leadId?: string }
) {
  const answers = asAnswers(session.answers);
  const settings = asSettings(form.settings);
  const node = findNode(definition, session.currentNodeId);
  const completed = session.status === "COMPLETED" || session.status === "DISQUALIFIED";
  const temperature = temperatureFromScore(session.score, form);

  const leadFields = {
    fullName: null as string | null,
    email: null as string | null,
    phone: null as string | null,
    companyName: null as string | null,
    answers,
    customFields: {} as Record<string, { label: string; value: unknown }>,
  };

  // hydrate mapped fields from answers for vars
  for (const n of definition.nodes) {
    if (n.mapTo && answers[n.id] != null) {
      applyMapTo(n.mapTo, answers[n.id], n, leadFields, settings.leadFields?.customFieldLabels);
    }
  }
  const vars = buildVarsFromLead(leadFields);

  let redirectUrl: string | null = session.completionRedirectUrl;
  if (!redirectUrl && node && isTerminal(node.type) && node.redirectUrl) {
    redirectUrl = interpolateVars(node.redirectUrl, vars) || null;
  }

  const returnRedirectUrl = settings.chat?.returnRedirectUrl
    ? interpolateVars(settings.chat.returnRedirectUrl, vars) || null
    : null;

  let publicNode = node ? toPublicNode(node) : null;
  if (publicNode && (publicNode.redirectUrl || publicNode.description || publicNode.title)) {
    publicNode = {
      ...publicNode,
      title: publicNode.title ? interpolateVars(publicNode.title, vars) : null,
      description: publicNode.description
        ? interpolateVars(publicNode.description, vars)
        : null,
      placeholder: publicNode.placeholder
        ? interpolateVars(publicNode.placeholder, vars)
        : null,
      redirectUrl: publicNode.redirectUrl
        ? interpolateVars(String(publicNode.redirectUrl), vars)
        : publicNode.redirectUrl,
    };
  }

  return {
    sessionToken: session.sessionToken,
    status: session.status,
    score: session.score,
    currentNode: publicNode,
    completed,
    leadId: extras?.leadId,
    redirectUrl,
    returnRedirectUrl,
    temperature,
    alreadyCompleted: extras?.alreadyCompleted ?? false,
  };
}

const VISITOR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function getPublicFormMeta(publicSlug: string) {
  const packed = await findPublishedByPublicSlug(publicSlug);
  if (!packed) return null;
  return publicMeta(packed.form);
}

export async function startSession(
  publicSlug: string,
  tracking: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    gclid?: string;
    fbclid?: string;
    ttclid?: string;
    referrer?: string;
    landingPage?: string;
    deviceType?: string;
    osName?: string;
    browserName?: string;
    visitorKey?: string;
  },
  meta: { ipAddress?: string; userAgent?: string }
) {
  const packed = await findPublishedByPublicSlug(publicSlug);
  if (!packed) return { error: "not_found" as const };

  const { form, definition } = packed;
  const visitorKey =
    tracking.visitorKey &&
    tracking.visitorKey.length >= 8 &&
    tracking.visitorKey.length <= 80 &&
    /^[a-zA-Z0-9_-]+$/.test(tracking.visitorKey)
      ? tracking.visitorKey
      : undefined;

  if (visitorKey) {
    const since = new Date(Date.now() - VISITOR_WINDOW_MS);
    const prev = await prisma.smartFormSession.findFirst({
      where: {
        formId: form.id,
        visitorKey,
        status: "COMPLETED",
        completedAt: { gte: since },
      },
      include: { lead: { select: { id: true } } },
      orderBy: { completedAt: "desc" },
    });
    if (prev) {
      return {
        state: await buildSessionState(prev, form, definition, {
          alreadyCompleted: true,
          leadId: prev.lead?.id,
        }),
      };
    }
  }

  let currentNodeId = advancePastDisplayNodes(
    definition,
    definition.startNodeId,
    {},
    0,
    []
  );

  const session = await prisma.smartFormSession.create({
    data: {
      formId: form.id,
      sessionToken: newSessionToken(),
      status: "IN_PROGRESS",
      currentNodeId,
      answers: {},
      score: 0,
      tags: [],
      utmSource: tracking.utmSource,
      utmMedium: tracking.utmMedium,
      utmCampaign: tracking.utmCampaign,
      utmTerm: tracking.utmTerm,
      utmContent: tracking.utmContent,
      gclid: tracking.gclid,
      fbclid: tracking.fbclid,
      ttclid: tracking.ttclid,
      referrer: tracking.referrer,
      landingPage: tracking.landingPage,
      deviceType: tracking.deviceType,
      osName: tracking.osName,
      browserName: tracking.browserName,
      visitorKey,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  await bumpAnalytics(form.id, { visitors: 1, started: 1 });

  // If land on terminal immediately (empty flow edge case)
  const startNode = findNode(definition, currentNodeId);
  if (startNode && isTerminal(startNode.type)) {
    return completeSession(session.id, startNode.id);
  }

  return { state: await buildSessionState(session, form, definition) };
}

export async function resumeSession(publicSlug: string, sessionToken: string) {
  const packed = await findPublishedByPublicSlug(publicSlug);
  if (!packed) return { error: "not_found" as const };
  const session = await prisma.smartFormSession.findFirst({
    where: { sessionToken, formId: packed.form.id },
    include: { lead: { select: { id: true } } },
  });
  if (!session) return { error: "session_not_found" as const };
  return {
    state: await buildSessionState(session, packed.form, packed.definition, {
      leadId: session.lead?.id,
      alreadyCompleted: session.status === "COMPLETED",
    }),
  };
}

export async function answerSession(
  publicSlug: string,
  sessionToken: string,
  nodeId: string,
  answer: AnswerValue
) {
  const packed = await findPublishedByPublicSlug(publicSlug);
  if (!packed) return { error: "not_found" as const };
  const { form, definition } = packed;

  const session = await prisma.smartFormSession.findFirst({
    where: { sessionToken, formId: form.id },
  });
  if (!session) return { error: "session_not_found" as const };
  if (session.status !== "IN_PROGRESS") {
    const lead = await prisma.smartFormLead.findUnique({
      where: { sessionId: session.id },
      select: { id: true },
    });
    return {
      state: await buildSessionState(session, form, definition, {
        leadId: lead?.id,
        alreadyCompleted: true,
      }),
    };
  }
  if (session.currentNodeId !== nodeId) {
    return { error: "wrong_node" as const, message: "Nó atual não corresponde" };
  }

  const node = findNode(definition, nodeId);
  if (!node) return { error: "invalid_node" as const };

  const validated = validateNodeAnswer(node, answer);
  if (!validated.ok) return { error: "validation" as const, message: validated.error };

  const answers = asAnswers(session.answers);
  answers[nodeId] = validated.value;

  const { delta, tags: newTags } = scoreAndTagsForAnswer(node, validated.value);
  const score = session.score + delta;
  const tags = [...new Set([...session.tags, ...newTags])];

  if (isTerminal(node.type)) {
    await prisma.smartFormSession.update({
      where: { id: session.id },
      data: {
        answers: answers as Prisma.InputJsonValue,
        score,
        tags,
        lastActivityAt: new Date(),
      },
    });
    return completeSession(session.id, nodeId);
  }

  let nextId = resolveNextNodeId(definition, nodeId, validated.value, answers, score, tags);
  // Não pula `message` aqui — o client auto-avança display-only para mostrar o transcript.

  const updated = await prisma.smartFormSession.update({
    where: { id: session.id },
    data: {
      answers: answers as Prisma.InputJsonValue,
      score,
      tags,
      currentNodeId: nextId,
      lastActivityAt: new Date(),
    },
  });

  if (!nextId) {
    return completeSession(updated.id, nodeId);
  }

  return { state: await buildSessionState(updated, form, definition) };
}

export async function abandonSession(publicSlug: string, sessionToken: string) {
  const packed = await findPublishedByPublicSlug(publicSlug);
  if (!packed) return { error: "not_found" as const };
  const session = await prisma.smartFormSession.findFirst({
    where: { sessionToken, formId: packed.form.id },
  });
  if (!session) return { error: "session_not_found" as const };
  if (session.status === "IN_PROGRESS") {
    await prisma.smartFormSession.update({
      where: { id: session.id },
      data: {
        status: "ABANDONED",
        abandonedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });
    await bumpAnalytics(packed.form.id, { abandoned: 1 });
  }
  const refreshed = await prisma.smartFormSession.findUniqueOrThrow({
    where: { id: session.id },
  });
  return { state: await buildSessionState(refreshed, packed.form, packed.definition) };
}

async function completeSession(sessionId: string, terminalNodeId: string) {
  const session = await prisma.smartFormSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { form: { include: { publishedVersion: true } } },
  });
  const form = session.form;
  if (!form.publishedVersion) {
    throw new Error("Form sem versão publicada");
  }
  const definition = coerceDefinition(form.publishedVersion.definition);
  const answers = asAnswers(session.answers);
  const settings = asSettings(form.settings);
  const terminal = findNode(definition, terminalNodeId);

  const leadFields = {
    fullName: null as string | null,
    email: null as string | null,
    phone: null as string | null,
    companyName: null as string | null,
    customFields: {} as Record<string, { label: string; value: unknown }>,
  };
  for (const n of definition.nodes) {
    if (n.mapTo && answers[n.id] != null) {
      applyMapTo(n.mapTo, answers[n.id], n, leadFields, settings.leadFields?.customFieldLabels);
    }
  }

  const temperature = temperatureFromScore(session.score, form);

  const vars = buildVarsFromLead({ ...leadFields, answers });
  const redirectUrl = terminal?.redirectUrl
    ? interpolateVars(terminal.redirectUrl, vars) || null
    : null;

  const notifyTeam = terminal ? terminal.notifyTeam !== false : true;
  const trackPaid =
    terminal?.trackPaidConversion !== undefined
      ? terminal.trackPaidConversion
      : notifyTeam;

  const updatedSession = await prisma.smartFormSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      currentNodeId: terminalNodeId,
      completedAt: new Date(),
      lastActivityAt: new Date(),
      completionRedirectUrl: redirectUrl,
      answers: answers as Prisma.InputJsonValue,
    },
  });

  const lead = await prisma.smartFormLead.upsert({
    where: { sessionId: session.id },
    create: {
      formId: form.id,
      sessionId: session.id,
      status: "COMPLETED",
      temperature,
      score: session.score,
      tags: session.tags,
      fullName: leadFields.fullName,
      email: leadFields.email,
      phone: leadFields.phone,
      companyName: leadFields.companyName,
      customFields: leadFields.customFields as Prisma.InputJsonValue,
      answers: answers as Prisma.InputJsonValue,
      utmSource: session.utmSource,
      utmMedium: session.utmMedium,
      utmCampaign: session.utmCampaign,
      utmTerm: session.utmTerm,
      utmContent: session.utmContent,
      gclid: session.gclid,
      fbclid: session.fbclid,
      ttclid: session.ttclid,
      referrer: session.referrer,
      landingPage: session.landingPage,
    },
    update: {
      temperature,
      score: session.score,
      tags: session.tags,
      fullName: leadFields.fullName,
      email: leadFields.email,
      phone: leadFields.phone,
      companyName: leadFields.companyName,
      customFields: leadFields.customFields as Prisma.InputJsonValue,
      answers: answers as Prisma.InputJsonValue,
    },
  });

  await prisma.smartFormLeadEvent.create({
    data: {
      leadId: lead.id,
      eventType: "system",
      eventName: "completed",
      nodeId: terminalNodeId,
      payload: { temperature, score: session.score, notifyTeam, trackPaid },
    },
  });

  await bumpAnalytics(form.id, {
    completed: 1,
    qualified: temperature === "HOT" || temperature === "VERY_HOT" ? 1 : 0,
    disqualified: temperature === "COLD" ? 1 : 0,
  });

  // fire-and-forget post-submit
  void runPostSubmit({
    form,
    lead,
    session: updatedSession,
    settings,
    notifyTeam,
    trackPaid,
    definition,
    terminalNodeId,
  }).catch((err) => {
    console.error("[smart-forms] post-submit", err);
  });

  return {
    state: await buildSessionState(updatedSession, form, definition, {
      leadId: lead.id,
    }),
  };
}

export async function bumpAnalytics(
  formId: string,
  delta: Partial<{
    visitors: number;
    started: number;
    completed: number;
    abandoned: number;
    qualified: number;
    disqualified: number;
  }>
) {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  await prisma.smartFormAnalyticsDaily.upsert({
    where: { formId_day: { formId, day } },
    create: {
      formId,
      day,
      visitors: delta.visitors || 0,
      started: delta.started || 0,
      completed: delta.completed || 0,
      abandoned: delta.abandoned || 0,
      qualified: delta.qualified || 0,
      disqualified: delta.disqualified || 0,
    },
    update: {
      visitors: delta.visitors ? { increment: delta.visitors } : undefined,
      started: delta.started ? { increment: delta.started } : undefined,
      completed: delta.completed ? { increment: delta.completed } : undefined,
      abandoned: delta.abandoned ? { increment: delta.abandoned } : undefined,
      qualified: delta.qualified ? { increment: delta.qualified } : undefined,
      disqualified: delta.disqualified ? { increment: delta.disqualified } : undefined,
    },
  });
}

export {
  asSettings,
  asAnswers,
  asCustomFields,
  coerceDefinition,
  parseDefinition,
  emptyDefinition,
  publicMeta,
  loadPublishedDefinition,
  findPublishedByPublicSlug,
};
