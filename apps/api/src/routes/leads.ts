import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma, type Prisma } from "@muratori/database";
import { resolveLegacyWorkspaceId } from "../lib/workspaces";

const upsertLeadSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  email: z
    .string()
    .regex(
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
      "E-mail inválido"
    ),
  phone: z.string().min(10),
  companyName: z.string().min(2),
  numberOfAttendants: z.number().int().positive().optional().nullable(),
  niches: z.array(z.string()).optional(),
  clientsPerDay: z.number().int().positive().optional().nullable(),
  revenueLevel: z.string().optional().nullable(),
  responseTime: z
    .enum(["imediato", "minutos", "horas", "dias"])
    .optional()
    .nullable(),
  additionalInfo: z.string().optional().nullable(),
  answers: z.record(z.unknown()).optional(),
  sourcePage: z.string().optional().nullable(),
  landingUrl: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  hostname: z.string().optional().nullable(),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  utmContent: z.string().optional().nullable(),
  utmTerm: z.string().optional().nullable(),
  gclid: z.string().optional().nullable(),
  gbraid: z.string().optional().nullable(),
  wbraid: z.string().optional().nullable(),
  fbclid: z.string().optional().nullable(),
  fbp: z.string().optional().nullable(),
  fbc: z.string().optional().nullable(),
  segment: z.string().optional(),
  pageConfigId: z.string().uuid().optional().nullable(),
});

const checkCompletedSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  hostname: z.string().optional(),
  slug: z.string().optional(),
});

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export const leadsRoutes: FastifyPluginAsync = async (app) => {
  /** Anti-duplicidade — equivalente ao RPC check_qualification_completed */
  app.get("/leads/check-completed", async (request, reply) => {
    const query = checkCompletedSchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: "Parâmetros inválidos" });
    }

    const email = query.data.email?.trim().toLowerCase();
    const phone = query.data.phone ? digitsOnly(query.data.phone) : undefined;

    if (!email && !phone) {
      return reply.status(400).send({ error: "Informe email ou phone" });
    }

    const workspaceId = await resolveLegacyWorkspaceId({
      hostname: query.data.hostname,
      slug: query.data.slug,
    });
    if (!workspaceId) return { completed: false };

    const lead = await prisma.qualificationLead.findFirst({
      where: {
        workspaceId,
        completedAt: { not: null },
        OR: [
          ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
          ...(phone
            ? [
                {
                  phone: {
                    contains: phone.slice(-11),
                  },
                },
              ]
            : []),
        ],
      },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        name: true,
        companyName: true,
        completedAt: true,
      },
    });

    if (!lead) {
      return { completed: false };
    }

    return {
      completed: true,
      name: lead.name,
      companyName: lead.companyName,
      completedAt: lead.completedAt,
      leadId: lead.id,
    };
  });

  /** Autosave incremental do formulário de diagnóstico */
  app.post("/leads/autosave", async (request, reply) => {
    const parsed = upsertLeadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Dados inválidos",
        details: parsed.error.flatten(),
      });
    }

    const data = parsed.data;
    const email = data.email.trim().toLowerCase();
    const workspaceId = await resolveLegacyWorkspaceId({
      hostname: data.hostname,
      slug: data.sourcePage,
    });
    if (!workspaceId) {
      return reply.status(503).send({ error: "Nenhum workspace configurado" });
    }

    if (data.pageConfigId) {
      const page = await prisma.diagnosticPageConfig.findFirst({
        where: { id: data.pageConfigId, workspaceId },
        select: { id: true },
      });
      if (!page) return reply.status(400).send({ error: "Página inválida" });
    }

    if (data.id) {
      const existing = await prisma.qualificationLead.findFirst({
        where: { id: data.id, workspaceId },
        select: { id: true },
      });
      if (!existing) return reply.status(404).send({ error: "Lead não encontrado" });

      const updated = await prisma.qualificationLead.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email,
          phone: data.phone,
          companyName: data.companyName,
          numberOfAttendants: data.numberOfAttendants ?? undefined,
          niches: data.niches,
          clientsPerDay: data.clientsPerDay ?? undefined,
          revenueLevel: data.revenueLevel ?? undefined,
          responseTime: data.responseTime ?? undefined,
          additionalInfo: data.additionalInfo ?? undefined,
          answers: (data.answers as Prisma.InputJsonValue | undefined) ?? undefined,
          // Atribuição: só preenche se ainda estiver vazia (first touch)
          sourcePage: data.sourcePage ?? undefined,
        },
      });
      return { id: updated.id, updated: true };
    }

    const created = await prisma.qualificationLead.create({
      data: {
        workspaceId,
        name: data.name,
        email,
        phone: data.phone,
        companyName: data.companyName,
        numberOfAttendants: data.numberOfAttendants ?? undefined,
        niches: data.niches ?? [],
        clientsPerDay: data.clientsPerDay ?? undefined,
        revenueLevel: data.revenueLevel ?? undefined,
        responseTime: data.responseTime ?? undefined,
        additionalInfo: data.additionalInfo ?? undefined,
        answers: (data.answers as Prisma.InputJsonValue | undefined) ?? {},
        sourcePage: data.sourcePage ?? undefined,
        landingUrl: data.landingUrl ?? undefined,
        referrer: data.referrer ?? undefined,
        hostname: data.hostname ?? undefined,
        utmSource: data.utmSource ?? undefined,
        utmMedium: data.utmMedium ?? undefined,
        utmCampaign: data.utmCampaign ?? undefined,
        utmContent: data.utmContent ?? undefined,
        utmTerm: data.utmTerm ?? undefined,
        gclid: data.gclid ?? undefined,
        gbraid: data.gbraid ?? undefined,
        wbraid: data.wbraid ?? undefined,
        fbclid: data.fbclid ?? undefined,
        fbp: data.fbp ?? undefined,
        fbc: data.fbc ?? undefined,
        segment: data.segment ?? "agencia_marketing",
        pageConfigId: data.pageConfigId ?? undefined,
      },
    });

    return reply.status(201).send({ id: created.id, created: true });
  });
};
