import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@muratori/database";
import { z } from "zod";
import {
  abandonSession,
  answerSession,
  getPublicFormMeta,
  resumeSession,
  startSession,
} from "./service";
import type { AnswerValue } from "./types";

const trackingSchema = z.object({
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmTerm: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
  gclid: z.string().max(200).optional(),
  fbclid: z.string().max(200).optional(),
  ttclid: z.string().max(200).optional(),
  referrer: z.string().max(2000).optional(),
  landingPage: z.string().max(2000).optional(),
  deviceType: z.string().max(40).optional(),
  osName: z.string().max(80).optional(),
  browserName: z.string().max(80).optional(),
  visitorKey: z
    .string()
    .min(8)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

export const smartFormsPublicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/public/forms/resolve-host", async (request, reply) => {
    const host = String((request.query as { host?: string }).host || "")
      .toLowerCase()
      .split(":")[0]
      .trim();
    if (!host) return reply.status(400).send({ error: "host obrigatório" });
    const domain = await prisma.smartFormDomain.findFirst({
      where: { hostname: host, status: "active", formId: { not: null } },
      include: { form: { select: { id: true, publicSlug: true, status: true, deletedAt: true } } },
    });
    if (!domain?.form || domain.form.deletedAt || domain.form.status !== "PUBLISHED") {
      return reply.status(404).send({ error: "Host não mapeado" });
    }
    return { publicSlug: domain.form.publicSlug, formId: domain.form.id };
  });

  app.get("/public/forms/og-html", async (request, reply) => {
    const slug = String((request.query as { slug?: string }).slug || "");
    const meta = slug ? await getPublicFormMeta(slug) : null;
    const title = (meta?.seo as { title?: string } | undefined)?.title || meta?.name || "Formulário";
    const description =
      (meta?.seo as { description?: string } | undefined)?.description ||
      meta?.description ||
      "";
    const ogImage = (meta?.seo as { ogImage?: string } | undefined)?.ogImage || "";
    const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}"/>` : ""}
</head><body></body></html>`;
    reply.header("Content-Type", "text/html; charset=utf-8");
    return html;
  });

  app.get("/public/forms/tls-ask", async (request) => {
    const host = String((request.query as { host?: string }).host || "")
      .toLowerCase()
      .trim();
    const domain = host
      ? await prisma.smartFormDomain.findFirst({ where: { hostname: host } })
      : null;
    return {
      ok: Boolean(domain && (domain.status === "active" || domain.status === "pending_ssl")),
      hostname: host || null,
      status: domain?.status ?? null,
    };
  });

  app.get("/public/forms/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const meta = await getPublicFormMeta(slug);
    if (!meta) return reply.status(404).send({ error: "Formulário não encontrado" });
    return meta;
  });

  app.post("/public/forms/:slug/start", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const tracking = trackingSchema.parse(request.body ?? {});
    const result = await startSession(slug, tracking, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });
    if ("error" in result && result.error === "not_found") {
      return reply.status(404).send({ error: "Formulário não encontrado" });
    }
    return result.state;
  });

  app.post("/public/forms/:slug/resume", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = z.object({ sessionToken: z.string().min(16).max(64) }).parse(request.body);
    const result = await resumeSession(slug, body.sessionToken);
    if ("error" in result) {
      const code = result.error === "not_found" ? 404 : 404;
      return reply.status(code).send({ error: result.error });
    }
    return result.state;
  });

  app.post("/public/forms/:slug/answer", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = z
      .object({
        sessionToken: z.string().min(16).max(64),
        nodeId: z.string().min(1).max(64),
        answer: z
          .union([
            z.string(),
            z.number(),
            z.boolean(),
            z.array(z.string()),
            z.null(),
          ])
          .optional(),
      })
      .parse(request.body);

    const result = await answerSession(
      slug,
      body.sessionToken,
      body.nodeId,
      (body.answer ?? null) as AnswerValue
    );

    if ("error" in result) {
      if (result.error === "validation") {
        return reply.status(400).send({ error: result.message || "validação" });
      }
      if (result.error === "wrong_node") {
        return reply.status(409).send({ error: result.message || "nó incorreto" });
      }
      return reply.status(404).send({ error: result.error });
    }
    return result.state;
  });

  app.post("/public/forms/:slug/abandon", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = z.object({ sessionToken: z.string().min(16).max(64) }).parse(request.body);
    const result = await abandonSession(slug, body.sessionToken);
    if ("error" in result) {
      return reply.status(404).send({ error: result.error });
    }
    return result.state;
  });
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
