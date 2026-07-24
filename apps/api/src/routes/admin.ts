import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@muratori/database";
import type { Prisma } from "@muratori/database";
import { currentWorkspaceId, requirePermission } from "../plugins/require-admin";

const pageSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  domain: z.string().nullable().optional(),
  active: z.boolean().optional(),
  brandName: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  primaryColor: z.string().nullable().optional(),
  secondaryColor: z.string().nullable().optional(),
  checkoutUrl: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  whatsappMessageTemplate: z.string().nullable().optional(),
  segmentPreset: z.string().optional(),
  gtmId: z.string().nullable().optional(),
  ga4MeasurementId: z.string().nullable().optional(),
  googleAdsId: z.string().nullable().optional(),
  googleAdsConversionLabel: z.string().nullable().optional(),
  metaPixelId: z.string().nullable().optional(),
  qualificationRule: z.record(z.unknown()).nullable().optional(),
});

const whatsappSchema = z.object({
  whatsappNumber: z.string().min(10),
  whatsappMessageTemplate: z.string().min(10),
  active: z.boolean().optional(),
});

const offerSchema = z.object({
  name: z.string().min(2),
  price: z.number().positive(),
  features: z.array(z.string()),
  checkoutUrl: z.string().url(),
  rule: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});

const leadStatusSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "converted", "rejected"]),
});

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const readLeads = { preHandler: requirePermission("leads.read") };
  const readLegacy = { preHandler: requirePermission("legacy.access") };
  const writeSettings = { preHandler: requirePermission("settings.write") };

  app.get("/admin/stats", readLeads, async (request) => {
    const workspaceId = currentWorkspaceId(request);
    const [total, completed, qualified, today] = await Promise.all([
      prisma.qualificationLead.count({ where: { workspaceId } }),
      prisma.qualificationLead.count({ where: { workspaceId, completedAt: { not: null } } }),
      prisma.qualificationLead.count({ where: { workspaceId, isQualified: true } }),
      prisma.qualificationLead.count({
        where: {
          workspaceId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);
    return { total, completed, qualified, today };
  });

  app.get("/admin/leads", readLeads, async (request) => {
    const q = request.query as {
      page?: string;
      q?: string;
      status?: string;
      qualified?: string;
    };
    const page = Math.max(1, Number(q.page || 1));
    const take = 30;
    const skip = (page - 1) * take;

    const where: Prisma.QualificationLeadWhereInput = {
      workspaceId: currentWorkspaceId(request),
    };
    if (q.status) where.status = q.status as Prisma.QualificationLeadWhereInput["status"];
    if (q.qualified === "true") where.isQualified = true;
    if (q.qualified === "false") where.isQualified = false;
    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: "insensitive" } },
        { email: { contains: q.q, mode: "insensitive" } },
        { companyName: { contains: q.q, mode: "insensitive" } },
        { phone: { contains: q.q } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.qualificationLead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          numberOfAttendants: true,
          clientsPerDay: true,
          revenueLevel: true,
          responseTime: true,
          niches: true,
          status: true,
          isQualified: true,
          qualificationScore: true,
          completedAt: true,
          whatsappClicked: true,
          sourcePage: true,
          utmSource: true,
          utmCampaign: true,
          createdAt: true,
        },
      }),
      prisma.qualificationLead.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / take) };
  });

  app.get("/admin/leads/:id", readLeads, async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await prisma.qualificationLead.findFirst({
      where: { id, workspaceId: currentWorkspaceId(request) },
      include: { deliveryLogs: { orderBy: { createdAt: "desc" } } },
    });
    if (!lead) return reply.status(404).send({ error: "Lead não encontrado" });
    return lead;
  });

  app.patch("/admin/leads/:id/status", readLeads, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = leadStatusSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Status inválido" });
    const existing = await prisma.qualificationLead.findFirst({
      where: { id, workspaceId: currentWorkspaceId(request) },
      select: { id: true },
    });
    if (!existing) return reply.status(404).send({ error: "Lead não encontrado" });
    return prisma.qualificationLead.update({
      where: { id },
      data: { status: parsed.data.status },
    });
  });

  app.get("/admin/pages", readLegacy, async (request) => {
    return prisma.diagnosticPageConfig.findMany({
      where: { workspaceId: currentWorkspaceId(request) },
      orderBy: { updatedAt: "desc" },
    });
  });

  app.post("/admin/pages", readLegacy, async (request, reply) => {
    const parsed = pageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    try {
      const page = await prisma.diagnosticPageConfig.create({
        data: {
          ...parsed.data,
          workspaceId: currentWorkspaceId(request),
          domain: parsed.data.domain || null,
          qualificationRule: (parsed.data.qualificationRule as Prisma.InputJsonValue) ?? undefined,
        },
      });
      return reply.status(201).send(page);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Unique constraint")) {
        return reply.status(409).send({ error: "Slug ou domínio já em uso" });
      }
      throw error;
    }
  });

  app.patch("/admin/pages/:id", readLegacy, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = pageSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const existing = await prisma.diagnosticPageConfig.findFirst({
      where: { id, workspaceId: currentWorkspaceId(request) },
      select: { id: true },
    });
    if (!existing) return reply.status(404).send({ error: "Página não encontrada" });
    try {
      return await prisma.diagnosticPageConfig.update({
        where: { id },
        data: {
          ...parsed.data,
          domain: parsed.data.domain === undefined ? undefined : parsed.data.domain || null,
          qualificationRule: (parsed.data.qualificationRule as Prisma.InputJsonValue) ?? undefined,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Unique constraint")) {
        return reply.status(409).send({ error: "Slug ou domínio já em uso" });
      }
      throw error;
    }
  });

  app.post("/admin/pages/:id/duplicate", readLegacy, async (request, reply) => {
    const workspaceId = currentWorkspaceId(request);
    const { id } = request.params as { id: string };
    const page = await prisma.diagnosticPageConfig.findFirst({ where: { id, workspaceId } });
    if (!page) return reply.status(404).send({ error: "Página não encontrada" });
    const copy = await prisma.diagnosticPageConfig.create({
      data: {
        workspaceId,
        name: `${page.name} (cópia)`,
        slug: `${page.slug}-copia-${Date.now().toString(36)}`,
        domain: null,
        active: false,
        brandName: page.brandName,
        logoUrl: page.logoUrl,
        primaryColor: page.primaryColor,
        secondaryColor: page.secondaryColor,
        checkoutUrl: page.checkoutUrl,
        whatsappNumber: page.whatsappNumber,
        whatsappMessageTemplate: page.whatsappMessageTemplate,
        qualificationRule: (page.qualificationRule as Prisma.InputJsonValue) ?? undefined,
        segmentPreset: page.segmentPreset,
        gtmId: page.gtmId,
        ga4MeasurementId: page.ga4MeasurementId,
        googleAdsId: page.googleAdsId,
        googleAdsConversionLabel: page.googleAdsConversionLabel,
        metaPixelId: page.metaPixelId,
      },
    });
    return reply.status(201).send(copy);
  });

  app.get("/admin/whatsapp-config", writeSettings, async (request) => {
    return prisma.leadWhatsappConfig.findMany({
      where: { workspaceId: currentWorkspaceId(request) },
      orderBy: { updatedAt: "desc" },
    });
  });

  app.post("/admin/whatsapp-config", writeSettings, async (request, reply) => {
    const workspaceId = currentWorkspaceId(request);
    const parsed = whatsappSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Dados inválidos" });

    if (parsed.data.active !== false) {
      await prisma.leadWhatsappConfig.updateMany({
        where: { workspaceId },
        data: { active: false },
      });
    }

    const created = await prisma.leadWhatsappConfig.create({
      data: {
        workspaceId,
        whatsappNumber: parsed.data.whatsappNumber,
        whatsappMessageTemplate: parsed.data.whatsappMessageTemplate,
        active: parsed.data.active ?? true,
      },
    });
    return reply.status(201).send(created);
  });

  app.get("/admin/offers", readLegacy, async (request) => {
    return prisma.diagnosticOffer.findMany({
      where: { workspaceId: currentWorkspaceId(request) },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/admin/offers", readLegacy, async (request, reply) => {
    const parsed = offerSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Dados inválidos" });
    const offer = await prisma.diagnosticOffer.create({
      data: {
        workspaceId: currentWorkspaceId(request),
        name: parsed.data.name,
        price: parsed.data.price,
        features: parsed.data.features,
        checkoutUrl: parsed.data.checkoutUrl,
        rule: (parsed.data.rule as Prisma.InputJsonValue) ?? {},
        active: parsed.data.active ?? true,
      },
    });
    return reply.status(201).send(offer);
  });

  app.patch("/admin/offers/:id", readLegacy, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = offerSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Dados inválidos" });
    const existing = await prisma.diagnosticOffer.findFirst({
      where: { id, workspaceId: currentWorkspaceId(request) },
      select: { id: true },
    });
    if (!existing) return reply.status(404).send({ error: "Oferta não encontrada" });
    return prisma.diagnosticOffer.update({
      where: { id },
      data: {
        ...parsed.data,
        features: parsed.data.features,
        rule: parsed.data.rule as Prisma.InputJsonValue | undefined,
      },
    });
  });

  app.get("/admin/deliveries", readLegacy, async (request) => {
    const q = request.query as { status?: string };
    return prisma.deliveryLog.findMany({
      where: {
        lead: { workspaceId: currentWorkspaceId(request) },
        status: q.status ? (q.status as "pending" | "sent" | "failed" | "ignored") : undefined,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        lead: { select: { id: true, name: true, email: true, companyName: true } },
      },
    });
  });

  app.post("/admin/deliveries/:id/retry", readLegacy, async (request, reply) => {
    const { id } = request.params as { id: string };
    const log = await prisma.deliveryLog.findFirst({
      where: { id, lead: { workspaceId: currentWorkspaceId(request) } },
    });
    if (!log) return reply.status(404).send({ error: "Não encontrado" });

    await prisma.deliveryLog.update({
      where: { id },
      data: { status: "pending", lastError: null },
    });

    const { enqueueDelivery } = await import("../services/delivery");
    const result = await enqueueDelivery({
      leadId: log.leadId,
      destination: log.destination,
      eventName: log.eventName,
    });
    return result;
  });

  app.get("/admin/flows", readLegacy, async (request) => {
    return prisma.diagnosticFlow.findMany({
      where: { workspaceId: currentWorkspaceId(request) },
      orderBy: [{ name: "asc" }, { version: "desc" }],
    });
  });

  app.get("/admin/flows/published", readLegacy, async (request) => {
    const flow = await prisma.diagnosticFlow.findFirst({
      where: {
        workspaceId: currentWorkspaceId(request),
        name: "default",
        publishedAt: { not: null },
      },
      orderBy: { version: "desc" },
    });
    return flow ?? { definition: null };
  });

  app.post("/admin/flows", readLegacy, async (request, reply) => {
    const workspaceId = currentWorkspaceId(request);
    const body = request.body as { name?: string; definition?: unknown; publish?: boolean };
    if (!body.definition || typeof body.definition !== "object") {
      return reply.status(400).send({ error: "definition JSON obrigatória" });
    }
    const name = body.name || "default";
    const latest = await prisma.diagnosticFlow.findFirst({
      where: { workspaceId, name },
      orderBy: { version: "desc" },
    });
    const version = (latest?.version ?? 0) + 1;
    const created = await prisma.diagnosticFlow.create({
      data: {
        workspaceId,
        name,
        version,
        definition: body.definition as Prisma.InputJsonValue,
        publishedAt: body.publish ? new Date() : null,
      },
    });
    return reply.status(201).send(created);
  });

  app.post("/admin/flows/:id/publish", readLegacy, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.diagnosticFlow.findFirst({
      where: { id, workspaceId: currentWorkspaceId(request) },
      select: { id: true },
    });
    if (!existing) return reply.status(404).send({ error: "Fluxo não encontrado" });
    return prisma.diagnosticFlow.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
  });
};
