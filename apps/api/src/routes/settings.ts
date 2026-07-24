import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@muratori/database";
import type { Prisma } from "@muratori/database";
import { currentWorkspaceId, requirePermission } from "../plugins/require-admin";
import { resolveLegacyWorkspaceId } from "../lib/workspaces";

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

async function getOrCreateSettings(workspaceId: string) {
  const existing = await prisma.settings.findUnique({ where: { workspaceId } });
  if (existing) return existing;
  return prisma.settings.create({
    data: {
      workspaceId,
      branding: DEFAULT_BRANDING,
      business: { segment: "agencia_marketing" },
      whatsapp: {},
      tracking: {},
    },
  });
}

/** Leitura pública — só campos de marca (nunca tokens) */
export const settingsPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/config/settings", async (request) => {
    const query = request.query as { hostname?: string; slug?: string };
    const workspaceId = await resolveLegacyWorkspaceId({
      hostname: query.hostname ?? (request.headers["x-forwarded-host"] as string | undefined),
      slug: query.slug,
    });
    const settings = workspaceId ? await getOrCreateSettings(workspaceId) : null;
    const branding = (settings?.branding as Record<string, unknown>) || {};
    const tracking = (settings?.tracking as Record<string, unknown>) || {};
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
  app.get(
    "/admin/settings",
    { preHandler: requirePermission("settings.read") },
    async (request) => {
      return getOrCreateSettings(currentWorkspaceId(request));
    },
  );

  app.patch(
    "/admin/settings",
    { preHandler: requirePermission("settings.write") },
    async (request, reply) => {
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
    }

    const current = await getOrCreateSettings(currentWorkspaceId(request));
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
    },
  );
};
