import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@muratori/database";
import type { Prisma } from "@muratori/database";
import { adminPreHandler } from "../plugins/require-admin";

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
  app.addHook("preHandler", adminPreHandler);

  app.get("/admin/stats", async () => {
    const [total, completed, qualified, today] = await Promise.all([
      prisma.qualificationLead.count(),
      prisma.qualificationLead.count({ where: { completedAt: { not: null } } }),
      prisma.qualificationLead.count({ where: { isQualified: true } }),
      prisma.qualificationLead.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);
    return { total, completed, qualified, today };
  });

  app.get("/admin/leads", async (request) => {
    const q = request.query as {
      page?: string;
      q?: string;
      status?: string;
      qualified?: string;
    };
    const page = Math.max(1, Number(q.page || 1));
    const take = 30;
    const skip = (page - 1) * take;

    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
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

  app.get("/admin/leads/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const lead = await prisma.qualificationLead.findUnique({
      where: { id },
      include: { deliveryLogs: { orderBy: { createdAt: "desc" } } },
    });
    if (!lead) return reply.status(404).send({ error: "Lead não encontrado" });
    return lead;
  });

  app.patch("/admin/leads/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = leadStatusSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Status inválido" });
    const lead = await prisma.qualificationLead.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return lead;
  });

  app.get("/admin/pages", async () => {
    return prisma.diagnosticPageConfig.findMany({ orderBy: { updatedAt: "desc" } });
  });

  app.post("/admin/pages", async (request, reply) => {
    const parsed = pageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    try {
      const page = await prisma.diagnosticPageConfig.create({
        data: {
          ...parsed.data,
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

  app.patch("/admin/pages/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = pageSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
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

  app.post("/admin/pages/:id/duplicate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const page = await prisma.diagnosticPageConfig.findUnique({ where: { id } });
    if (!page) return reply.status(404).send({ error: "Página não encontrada" });
    const copy = await prisma.diagnosticPageConfig.create({
      data: {
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

  app.get("/admin/whatsapp-config", async () => {
    return prisma.leadWhatsappConfig.findMany({ orderBy: { updatedAt: "desc" } });
  });

  app.post("/admin/whatsapp-config", async (request, reply) => {
    const parsed = whatsappSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Dados inválidos" });

    if (parsed.data.active !== false) {
      await prisma.leadWhatsappConfig.updateMany({ data: { active: false } });
    }

    const created = await prisma.leadWhatsappConfig.create({
      data: {
        whatsappNumber: parsed.data.whatsappNumber,
        whatsappMessageTemplate: parsed.data.whatsappMessageTemplate,
        active: parsed.data.active ?? true,
      },
    });
    return reply.status(201).send(created);
  });

  app.get("/admin/offers", async () => {
    return prisma.diagnosticOffer.findMany({ orderBy: { createdAt: "desc" } });
  });

  app.post("/admin/offers", async (request, reply) => {
    const parsed = offerSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Dados inválidos" });
    const offer = await prisma.diagnosticOffer.create({
      data: {
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

  app.patch("/admin/offers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = offerSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Dados inválidos" });
    return prisma.diagnosticOffer.update({
      where: { id },
      data: {
        ...parsed.data,
        features: parsed.data.features,
        rule: parsed.data.rule as Prisma.InputJsonValue | undefined,
      },
    });
  });

  app.get("/admin/deliveries", async (request) => {
    const q = request.query as { status?: string };
    return prisma.deliveryLog.findMany({
      where: q.status ? { status: q.status as "pending" | "sent" | "failed" | "ignored" } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        lead: { select: { id: true, name: true, email: true, companyName: true } },
      },
    });
  });

  app.post("/admin/deliveries/:id/retry", async (request, reply) => {
    const { id } = request.params as { id: string };
    const log = await prisma.deliveryLog.findUnique({ where: { id } });
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
};
