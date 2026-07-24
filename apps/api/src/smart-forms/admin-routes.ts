import type { FastifyPluginAsync } from "fastify";
import type { Prisma } from "@muratori/database";
import { prisma } from "@muratori/database";
import { z } from "zod";
import { currentWorkspaceId, requirePermission } from "../plugins/require-admin";
import { coerceDefinition, parseDefinition } from "./definition";
import { emptyDefinition } from "./types";
import {
  isValidSlug,
  uniqueWorkspaceSlug,
  uniquePublicSlug,
} from "./service";
import { publicUploadUrl, saveBase64Image } from "./assets";
import { verifyHostnameDns } from "./domain-verify";
import { ensureBuiltinTemplates } from "./builtin-templates";

const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const smartFormsAdminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/forms", { preHandler: requirePermission("forms.read") }, async (request) => {
    const q = request.query as {
      status?: string;
      q?: string;
      page?: string;
      pageSize?: string;
    };
    const page = Math.max(1, Number(q.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || 20)));
    const where: Prisma.SmartFormWhereInput = {
      workspaceId: currentWorkspaceId(request),
      deletedAt: null,
    };
    if (q.status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(q.status)) {
      where.status = q.status as "DRAFT" | "PUBLISHED" | "ARCHIVED";
    }
    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: "insensitive" } },
        { slug: { contains: q.q, mode: "insensitive" } },
        { publicSlug: { contains: q.q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.smartForm.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          publicSlug: true,
          status: true,
          description: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { leads: true, sessions: true } },
        },
      }),
      prisma.smartForm.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
  });

  app.post("/forms", { preHandler: requirePermission("forms.write") }, async (request, reply) => {
    const workspaceId = currentWorkspaceId(request);
    const body = z
      .object({
        name: z.string().min(2).max(160),
        description: z.string().max(4000).optional(),
        slug: slugSchema.optional(),
        draftDefinition: z.unknown().optional(),
        templateId: z.string().optional(),
      })
      .parse(request.body);

    let definition = emptyDefinition();
    let settings: Prisma.InputJsonValue = {};

    if (body.templateId) {
      const tpl = await prisma.smartFormTemplate.findFirst({
        where: {
          id: body.templateId,
          isActive: true,
          OR: [{ workspaceId: null }, { workspaceId }],
        },
      });
      if (tpl) {
        definition = coerceDefinition(tpl.definition);
        settings = (tpl.settings || {}) as Prisma.InputJsonValue;
      }
    } else if (body.draftDefinition) {
      definition = parseDefinition(body.draftDefinition);
    }

    const slug = body.slug
      ? body.slug
      : await uniqueWorkspaceSlug(workspaceId, body.name);
    if (!isValidSlug(slug)) {
      return reply.status(400).send({ error: "Slug inválido" });
    }
    const clash = await prisma.smartForm.findFirst({
      where: { workspaceId, slug, deletedAt: null },
    });
    if (clash) return reply.status(409).send({ error: "Slug já existe" });

    const publicSlug = await uniquePublicSlug(slug);
    const form = await prisma.smartForm.create({
      data: {
        workspaceId,
        name: body.name,
        slug,
        publicSlug,
        description: body.description,
        draftDefinition: definition as unknown as Prisma.InputJsonValue,
        settings,
        createdByUserId: request.admin?.sub ?? null,
        updatedByUserId: request.admin?.sub ?? null,
      },
    });
    return reply.status(201).send(form);
  });

  app.get("/forms/dashboard", { preHandler: requirePermission("forms.read") }, async (request) => {
    const workspaceId = currentWorkspaceId(request);
    const q = request.query as { formId?: string; from?: string; to?: string };
    const from = q.from ? new Date(q.from) : new Date(Date.now() - 30 * 86400000);
    const to = q.to ? new Date(q.to) : new Date();
    const formFilter = {
      form: {
        workspaceId,
        deletedAt: null,
        ...(q.formId ? { id: q.formId } : {}),
      },
    };

    const rows = await prisma.smartFormAnalyticsDaily.findMany({
      where: {
        ...formFilter,
        day: { gte: from, lte: to },
      },
      orderBy: { day: "asc" },
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.visitors += r.visitors;
        acc.started += r.started;
        acc.completed += r.completed;
        acc.abandoned += r.abandoned;
        acc.qualified += r.qualified;
        acc.disqualified += r.disqualified;
        return acc;
      },
      {
        visitors: 0,
        started: 0,
        completed: 0,
        abandoned: 0,
        qualified: 0,
        disqualified: 0,
      }
    );

    return { from, to, totals, series: rows };
  });

  app.get("/forms/templates", { preHandler: requirePermission("forms.read") }, async (request) => {
    await ensureBuiltinTemplates();
    const workspaceId = currentWorkspaceId(request);
    const items = await prisma.smartFormTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ workspaceId: null }, { workspaceId }],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return { items };
  });

  app.get("/forms/leads", { preHandler: requirePermission("leads.read") }, async (request) => {
    const q = request.query as {
      formId?: string;
      q?: string;
      temperature?: string;
      page?: string;
      pageSize?: string;
    };
    const page = Math.max(1, Number(q.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || 30)));
    const where: Prisma.SmartFormLeadWhereInput = {
      form: { workspaceId: currentWorkspaceId(request), deletedAt: null },
    };
    if (q.formId) where.formId = q.formId;
    if (q.temperature) {
      where.temperature = q.temperature as
        | "COLD"
        | "WARM"
        | "HOT"
        | "VERY_HOT";
    }
    if (q.q) {
      where.OR = [
        { fullName: { contains: q.q, mode: "insensitive" } },
        { email: { contains: q.q, mode: "insensitive" } },
        { phone: { contains: q.q } },
        { companyName: { contains: q.q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.smartFormLead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          form: { select: { id: true, name: true, publicSlug: true } },
        },
      }),
      prisma.smartFormLead.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
  });

  app.get(
    "/forms/leads/export",
    { preHandler: requirePermission("leads.export") },
    async (request, reply) => {
    const q = request.query as { formId?: string };
    const where: Prisma.SmartFormLeadWhereInput = {
      form: { workspaceId: currentWorkspaceId(request), deletedAt: null },
    };
    if (q.formId) where.formId = q.formId;
    const leads = await prisma.smartFormLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const header = [
      "id",
      "formId",
      "fullName",
      "email",
      "phone",
      "companyName",
      "score",
      "temperature",
      "status",
      "utmSource",
      "utmCampaign",
      "createdAt",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      header.join(","),
      ...leads.map((l) =>
        [
          l.id,
          l.formId,
          l.fullName,
          l.email,
          l.phone,
          l.companyName,
          l.score,
          l.temperature,
          l.status,
          l.utmSource,
          l.utmCampaign,
          l.createdAt.toISOString(),
        ]
          .map(escape)
          .join(",")
      ),
    ];
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", 'attachment; filename="smart-form-leads.csv"');
    return lines.join("\n");
    },
  );

  app.get(
    "/forms/leads/:leadId",
    { preHandler: requirePermission("leads.read") },
    async (request, reply) => {
    const { leadId } = request.params as { leadId: string };
    const lead = await prisma.smartFormLead.findFirst({
      where: {
        id: leadId,
        form: { workspaceId: currentWorkspaceId(request), deletedAt: null },
      },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        form: {
          select: {
            id: true,
            name: true,
            publicSlug: true,
            draftDefinition: true,
            publishedVersion: { select: { definition: true } },
          },
        },
        session: true,
      },
    });
    if (!lead) return reply.status(404).send({ error: "Lead não encontrado" });

    const definition = coerceDefinition(
      lead.form.publishedVersion?.definition ?? lead.form.draftDefinition
    );
    const nodeById = new Map(definition.nodes.map((n) => [n.id, n]));

    const answers = (lead.answers || {}) as Record<string, unknown>;
    const answerItems = Object.entries(answers).map(([nodeId, value]) => {
      const node = nodeById.get(nodeId);
      return {
        nodeId,
        title: node?.title || node?.internalName || nodeId,
        type: node?.type || null,
        mapTo: node?.mapTo || null,
        value,
      };
    });

    // Ordena respostas na ordem dos nós do fluxo, quando possível.
    const order = new Map(definition.nodes.map((n, i) => [n.id, i]));
    answerItems.sort(
      (a, b) => (order.get(a.nodeId) ?? 9999) - (order.get(b.nodeId) ?? 9999)
    );

    return { ...lead, answerItems };
    },
  );

  app.delete(
    "/forms/leads/:leadId",
    { preHandler: requirePermission("leads.delete") },
    async (request, reply) => {
      const { leadId } = request.params as { leadId: string };
      const lead = await prisma.smartFormLead.findFirst({
        where: {
          id: leadId,
          form: { workspaceId: currentWorkspaceId(request), deletedAt: null },
        },
      });
      if (!lead) return reply.status(404).send({ error: "Lead não encontrado" });
      await prisma.smartFormLead.delete({ where: { id: leadId } });
      return { ok: true };
    },
  );

  app.get("/forms/domains", { preHandler: requirePermission("domains.manage") }, async (request) => {
    const items = await prisma.smartFormDomain.findMany({
      where: { workspaceId: currentWorkspaceId(request) },
      orderBy: { createdAt: "desc" },
      include: { form: { select: { id: true, name: true, publicSlug: true } } },
    });
    return { items };
  });

  app.post(
    "/forms/domains",
    { preHandler: requirePermission("domains.manage") },
    async (request, reply) => {
      const workspaceId = currentWorkspaceId(request);
      const body = z
        .object({
          hostname: z.string().min(3).max(255),
          formId: z.string().optional(),
        })
        .parse(request.body);
      const hostname = body.hostname.toLowerCase().trim();

      if (body.formId) {
        const form = await prisma.smartForm.findFirst({
          where: { id: body.formId, workspaceId, deletedAt: null },
          select: { id: true },
        });
        if (!form) return reply.status(404).send({ error: "Formulário não encontrado" });
      }

      try {
        const domain = await prisma.smartFormDomain.create({
          data: {
            workspaceId,
            hostname,
            formId: body.formId,
            status: "pending_dns",
          },
        });
        return reply.status(201).send(domain);
      } catch {
        return reply.status(409).send({ error: "Hostname já cadastrado" });
      }
    },
  );

  app.delete(
    "/forms/domains/:id",
    { preHandler: requirePermission("domains.manage") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const domain = await prisma.smartFormDomain.findFirst({
        where: { id, workspaceId: currentWorkspaceId(request) },
      });
      if (!domain) return reply.status(404).send({ error: "Domínio não encontrado" });
      await prisma.smartFormDomain.delete({ where: { id } }).catch(() => null);
      return { ok: true };
    },
  );

  app.post(
    "/forms/domains/:id/verify",
    { preHandler: requirePermission("domains.manage") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const domain = await prisma.smartFormDomain.findFirst({
        where: { id, workspaceId: currentWorkspaceId(request) },
      });
      if (!domain) return reply.status(404).send({ error: "Domínio não encontrado" });

      const result = await verifyHostnameDns(domain.hostname);
      const updated = await prisma.smartFormDomain.update({
        where: { id },
        data: { status: result.status },
      });
      return { domain: updated, ...result };
    },
  );

  app.post("/forms/assets", { preHandler: requirePermission("forms.write") }, async (request, reply) => {
    const body = z
      .object({
        dataUrl: z.string().min(32).max(12_000_000),
      })
      .parse(request.body);

    try {
      const saved = await saveBase64Image({ dataUrl: body.dataUrl });
      // URL relativa: o admin (Vite proxy) e o app principal resolvem no mesmo host.
      const url = publicUploadUrl(saved.filename);
      return reply.status(201).send({
        url,
        filename: saved.filename,
        mime: saved.mime,
        bytes: saved.bytes,
      });
    } catch (e) {
      return reply.status(400).send({
        error: e instanceof Error ? e.message : "Upload inválido",
      });
    }
  });

  app.get("/forms/:id", { preHandler: requirePermission("forms.read") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const form = await prisma.smartForm.findFirst({
      where: { id, workspaceId: currentWorkspaceId(request), deletedAt: null },
      include: {
        publishedVersion: true,
        versions: { orderBy: { versionNumber: "desc" }, take: 10 },
      },
    });
    if (!form) return reply.status(404).send({ error: "Formulário não encontrado" });
    return form;
  });

  app.patch("/forms/:id", { preHandler: requirePermission("forms.write") }, async (request, reply) => {
    const workspaceId = currentWorkspaceId(request);
    const { id } = request.params as { id: string };
    const body = z
      .object({
        name: z.string().min(2).max(160).optional(),
        description: z.string().max(4000).nullable().optional(),
        slug: slugSchema.optional(),
        draftDefinition: z.unknown().optional(),
        settings: z.record(z.unknown()).optional(),
        scoreColdMax: z.number().int().optional(),
        scoreWarmMax: z.number().int().optional(),
        scoreHotMax: z.number().int().optional(),
        aiSystemPrompt: z.string().nullable().optional(),
        aiEnabled: z.boolean().optional(),
        crmSyncEnabled: z.boolean().optional(),
        status: z.enum(["DRAFT", "ARCHIVED"]).optional(),
      })
      .parse(request.body);

    const form = await prisma.smartForm.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!form) return reply.status(404).send({ error: "Formulário não encontrado" });

    if (body.slug && body.slug !== form.slug) {
      const clash = await prisma.smartForm.findFirst({
        where: {
          workspaceId,
          slug: body.slug,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (clash) return reply.status(409).send({ error: "Slug já existe" });
    }

    let draftDefinition: Prisma.InputJsonValue | undefined;
    if (body.draftDefinition !== undefined) {
      draftDefinition = parseDefinition(body.draftDefinition) as unknown as Prisma.InputJsonValue;
    }

    const updated = await prisma.smartForm.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description === undefined ? undefined : body.description,
        slug: body.slug,
        draftDefinition,
        settings:
          body.settings !== undefined
            ? (body.settings as Prisma.InputJsonValue)
            : undefined,
        scoreColdMax: body.scoreColdMax,
        scoreWarmMax: body.scoreWarmMax,
        scoreHotMax: body.scoreHotMax,
        aiSystemPrompt:
          body.aiSystemPrompt === undefined ? undefined : body.aiSystemPrompt,
        aiEnabled: body.aiEnabled,
        crmSyncEnabled: body.crmSyncEnabled,
        status: body.status,
        updatedByUserId: request.admin?.sub ?? null,
      },
    });
    return updated;
  });

  app.post(
    "/forms/:id/publish",
    { preHandler: requirePermission("forms.publish") },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ note: z.string().max(240).optional() }).parse(request.body ?? {});

    const form = await prisma.smartForm.findFirst({
      where: { id, workspaceId: currentWorkspaceId(request), deletedAt: null },
    });
    if (!form) return reply.status(404).send({ error: "Formulário não encontrado" });

    let definition;
    try {
      definition = parseDefinition(form.draftDefinition);
    } catch (e) {
      return reply.status(400).send({
        error: e instanceof Error ? e.message : "Definition inválida",
      });
    }

    const last = await prisma.smartFormVersion.findFirst({
      where: { formId: id },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (last?.versionNumber || 0) + 1;

    const version = await prisma.smartFormVersion.create({
      data: {
        formId: id,
        versionNumber,
        definition: definition as unknown as Prisma.InputJsonValue,
        publishedByUserId: request.admin?.sub ?? null,
        note: body.note,
      },
    });

    const updated = await prisma.smartForm.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedVersionId: version.id,
        publishedAt: new Date(),
        updatedByUserId: request.admin?.sub ?? null,
      },
      include: { publishedVersion: true },
    });

    return updated;
    },
  );

  app.post(
    "/forms/:id/duplicate",
    { preHandler: requirePermission("forms.write") },
    async (request, reply) => {
    const workspaceId = currentWorkspaceId(request);
    const { id } = request.params as { id: string };
    const form = await prisma.smartForm.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!form) return reply.status(404).send({ error: "Formulário não encontrado" });

    const slug = await uniqueWorkspaceSlug(workspaceId, `${form.slug}-copia`);
    const publicSlug = await uniquePublicSlug(slug);
    const copy = await prisma.smartForm.create({
      data: {
        workspaceId,
        name: `${form.name} (cópia)`,
        slug,
        publicSlug,
        description: form.description,
        draftDefinition: form.draftDefinition as Prisma.InputJsonValue,
        settings: form.settings as Prisma.InputJsonValue,
        scoreColdMax: form.scoreColdMax,
        scoreWarmMax: form.scoreWarmMax,
        scoreHotMax: form.scoreHotMax,
        aiSystemPrompt: form.aiSystemPrompt,
        aiEnabled: form.aiEnabled,
        crmSyncEnabled: form.crmSyncEnabled,
        status: "DRAFT",
        createdByUserId: request.admin?.sub ?? null,
        updatedByUserId: request.admin?.sub ?? null,
      },
    });
    return reply.status(201).send(copy);
    },
  );

  app.delete(
    "/forms/:id",
    { preHandler: requirePermission("forms.delete") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const form = await prisma.smartForm.findFirst({
        where: { id, workspaceId: currentWorkspaceId(request), deletedAt: null },
      });
      if (!form) return reply.status(404).send({ error: "Formulário não encontrado" });
      await prisma.smartForm.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: "ARCHIVED",
          updatedByUserId: request.admin?.sub ?? null,
        },
      });
      return { ok: true };
    },
  );
};
