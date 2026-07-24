import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@muratori/database";
import { sendInternalAlert } from "../services/notify";
import { enqueueDelivery } from "../services/delivery";

const completeSchema = z.object({
  id: z.string().uuid(),
  path: z.enum(["whatsapp", "checkout", "offer_view"]).default("whatsapp"),
  sourcePage: z.string().optional().nullable(),
});

const trackWhatsappSchema = z.object({
  leadId: z.string().uuid(),
  url: z.string().optional(),
});

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function isLowRevenue(level: string | null | undefined): boolean {
  return ["de_10_25", "baixo", "ate_25k"].includes(level ?? "");
}

export const leadsExtraRoutes: FastifyPluginAsync = async (app) => {
  /** Marca lead como concluído + qualificação server-side */
  app.post("/leads/complete", async (request, reply) => {
    const parsed = completeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
    }

    const lead = await prisma.qualificationLead.findUnique({
      where: { id: parsed.data.id },
    });

    if (!lead) {
      return reply.status(404).send({ error: "Lead não encontrado" });
    }

    // Anti-duplicidade
    const email = lead.email.trim().toLowerCase();
    const phone = digitsOnly(lead.phone);
    const duplicate = await prisma.qualificationLead.findFirst({
      where: {
        completedAt: { not: null },
        id: { not: lead.id },
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { phone: { contains: phone.slice(-11) } },
        ],
      },
      select: { id: true, name: true, companyName: true, completedAt: true },
    });

    if (duplicate) {
      return reply.status(409).send({
        error: "Diagnostico ja preenchido para este email ou telefone",
        completed: true,
        name: duplicate.name,
        companyName: duplicate.companyName,
        completedAt: duplicate.completedAt,
      });
    }

    const qualified = !isLowRevenue(lead.revenueLevel);
    const score = qualified ? 80 : 40;
    const reasons = {
      revenueLevel: lead.revenueLevel,
      path: parsed.data.path,
      qualified,
    };

    try {
      const updated = await prisma.qualificationLead.update({
        where: { id: lead.id },
        data: {
          completedAt: new Date(),
          status: "contacted",
          isQualified: qualified,
          qualificationScore: score,
          qualificationReasons: reasons,
          sourcePage: lead.sourcePage ?? parsed.data.sourcePage ?? undefined,
        },
      });

      // Alertas e pipeline — não bloqueiam resposta
      void sendInternalAlert({
        event: "lead_completed",
        leadId: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        companyName: updated.companyName,
        attendants: updated.numberOfAttendants,
        clientsPerDay: updated.clientsPerDay,
        niches: updated.niches,
        sourcePage: updated.sourcePage,
        path: parsed.data.path,
        isQualified: qualified,
      });

      void enqueueDelivery({
        leadId: updated.id,
        destination: "internal_webhook",
        eventName: "LeadCompleted",
        payload: { path: parsed.data.path, isQualified: qualified },
      });

      if (qualified) {
        void enqueueDelivery({
          leadId: updated.id,
          destination: "meta_capi",
          eventName: "QualifiedLead",
        });
        void enqueueDelivery({
          leadId: updated.id,
          destination: "google_ads",
          eventName: "QualifiedLead",
        });
      }

      return {
        id: updated.id,
        completed: true,
        isQualified: qualified,
        path: parsed.data.path,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Diagnostico ja preenchido")) {
        return reply.status(409).send({
          error: message,
          completed: true,
          name: lead.name,
          companyName: lead.companyName,
        });
      }
      throw error;
    }
  });

  app.post("/leads/track-whatsapp", async (request, reply) => {
    const parsed = trackWhatsappSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Dados inválidos" });
    }

    await prisma.qualificationLead.update({
      where: { id: parsed.data.leadId },
      data: {
        whatsappClicked: true,
        whatsappClickedAt: new Date(),
        whatsappSent: true,
        whatsappSentAt: new Date(),
      },
    });

    return { ok: true };
  });

  /** Config pública do WhatsApp */
  app.get("/config/whatsapp", async () => {
    const config = await prisma.leadWhatsappConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      select: {
        whatsappNumber: true,
        whatsappMessageTemplate: true,
      },
    });

    if (!config) {
      return {
        whatsappNumber: "5511999999999",
        whatsappMessageTemplate: null,
      };
    }

    return config;
  });

  /** Config pública da página de diagnóstico (slug ou hostname) */
  app.get("/config/diagnostic-page", async (request) => {
    const query = request.query as { slug?: string; hostname?: string };
    const hostname = query.hostname?.trim();
    const slug = query.slug?.trim() || "diagnostico";

    let page = null;
    if (hostname) {
      page = await prisma.diagnosticPageConfig.findFirst({
        where: { domain: hostname, active: true },
      });
    }
    if (!page) {
      page = await prisma.diagnosticPageConfig.findFirst({
        where: { slug, active: true },
      });
    }

    if (!page) {
      return {
        brandName: "Muratori",
        assistantName: "Muratori · IA",
        primaryColor: "#075e54",
        secondaryColor: "#128c7e",
        logoUrl: null,
        checkoutUrl: "https://pay.hotmart.com/ADAPTAR",
        whatsappNumber: null,
        whatsappMessageTemplate: null,
        segmentPreset: "agencia_marketing",
        offer: {
          name: "Plano Essencial",
          priceLabel: "R$ 199,90/mês",
          features: [
            "1 WhatsApp conectado + até 6 atendentes",
            "Chatbot e Agentes de IA (ChatGPT)",
            "CRM Kanban + histórico por lead/conta",
            "Follow-up e agendamento",
            "Mensagens ilimitadas",
            "Portal de membros",
            "Suporte e-mail/WhatsApp",
          ],
          note: "Implementação assistida opcional: R$ 1.000 — só se não quiser seguir as aulas do portal.",
        },
      };
    }

    const offer = await prisma.diagnosticOffer.findFirst({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });

    return {
      id: page.id,
      brandName: page.brandName ?? "Muratori",
      assistantName: `${page.brandName ?? "Muratori"} · IA`,
      primaryColor: page.primaryColor ?? "#075e54",
      secondaryColor: page.secondaryColor ?? "#128c7e",
      logoUrl: page.logoUrl,
      checkoutUrl: page.checkoutUrl ?? offer?.checkoutUrl ?? "https://pay.hotmart.com/ADAPTAR",
      whatsappNumber: page.whatsappNumber,
      whatsappMessageTemplate: page.whatsappMessageTemplate,
      segmentPreset: page.segmentPreset,
      gtmId: page.gtmId,
      ga4MeasurementId: page.ga4MeasurementId,
      metaPixelId: page.metaPixelId,
      googleAdsId: page.googleAdsId,
      offer: offer
        ? {
            name: offer.name,
            priceLabel: `R$ ${Number(offer.price).toFixed(2).replace(".", ",")}/mês`,
            features: Array.isArray(offer.features) ? offer.features : [],
            note: "Implementação assistida opcional: R$ 1.000 — só se não quiser seguir as aulas do portal.",
            checkoutUrl: offer.checkoutUrl,
          }
        : null,
    };
  });

  /** Fluxo publicado (público) */
  app.get("/config/flow", async () => {
    const flow = await prisma.diagnosticFlow.findFirst({
      where: { name: "default", publishedAt: { not: null } },
      orderBy: { version: "desc" },
      select: { id: true, version: true, definition: true, publishedAt: true },
    });
    if (!flow) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AGENCY_FLOW_V1 } = require("@muratori/database") as {
        AGENCY_FLOW_V1: unknown;
      };
      return { version: 1, definition: AGENCY_FLOW_V1, publishedAt: null };
    }
    return flow;
  });
};
