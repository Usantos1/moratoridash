import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@muratori/database";
import type { Prisma } from "@muratori/database";
import { adminPreHandler } from "../plugins/require-admin";

const brandingSchema = z.object({
  brandName: z.string().min(1).optional(),
  assistantName: z.string().min(1).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
});

const businessSchema = z.object({
  segment: z.string().optional(),
  description: z.string().optional(),
  audience: z.string().optional(),
  averageTicket: z.string().optional(),
});

const whatsappSchema = z.object({
  number: z.string().optional(),
  messageTemplate: z.string().optional(),
});

const trackingSchema = z.object({
  gtmId: z.string().optional(),
  ga4MeasurementId: z.string().optional(),
  googleAdsId: z.string().optional(),
  googleAdsConversionLabel: z.string().optional(),
  metaPixelId: z.string().optional(),
});

const settingsSchema = z.object({
  branding: brandingSchema.optional(),
  business: businessSchema.optional(),
  whatsapp: whatsappSchema.optional(),
  tracking: trackingSchema.optional(),
});

const DEFAULT_BRANDING = {
  brandName: "Muratori",
  assistantName: "Muratori · IA",
  primaryColor: "#075e54",
  secondaryColor: "#128c7e",
  logoUrl: null,
};

async function getOrCreateSettings() {
  const existing = await prisma.settings.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.settings.create({
    data: {
      branding: DEFAULT_BRANDING,
      business: { segment: "agencia_marketing" },
      whatsapp: {},
      tracking: {},
    },
  });
}

/** Leitura pública — só campos de marca (nunca tokens) */
export const settingsPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/config/settings", async () => {
    const settings = await getOrCreateSettings();
    const branding = (settings.branding as Record<string, unknown>) || {};
    const tracking = (settings.tracking as Record<string, unknown>) || {};
    return {
      brandName: branding.brandName ?? DEFAULT_BRANDING.brandName,
      assistantName: branding.assistantName ?? DEFAULT_BRANDING.assistantName,
      primaryColor: branding.primaryColor ?? DEFAULT_BRANDING.primaryColor,
      secondaryColor: branding.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
      logoUrl: branding.logoUrl ?? null,
      // Apenas IDs públicos; tokens permanecem no servidor
      gtmId: tracking.gtmId ?? null,
      ga4MeasurementId: tracking.ga4MeasurementId ?? null,
      metaPixelId: tracking.metaPixelId ?? null,
      googleAdsId: tracking.googleAdsId ?? null,
    };
  });
};

export const settingsAdminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", adminPreHandler);

  app.get("/admin/settings", async () => {
    return getOrCreateSettings();
  });

  app.patch("/admin/settings", async (request, reply) => {
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
    }

    const current = await getOrCreateSettings();
    const merge = (base: unknown, patch: unknown) => ({
      ...((base as Record<string, unknown>) || {}),
      ...((patch as Record<string, unknown>) || {}),
    });

    return prisma.settings.update({
      where: { id: current.id },
      data: {
        branding: parsed.data.branding
          ? (merge(current.branding, parsed.data.branding) as Prisma.InputJsonValue)
          : undefined,
        business: parsed.data.business
          ? (merge(current.business, parsed.data.business) as Prisma.InputJsonValue)
          : undefined,
        whatsapp: parsed.data.whatsapp
          ? (merge(current.whatsapp, parsed.data.whatsapp) as Prisma.InputJsonValue)
          : undefined,
        tracking: parsed.data.tracking
          ? (merge(current.tracking, parsed.data.tracking) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  });
};
