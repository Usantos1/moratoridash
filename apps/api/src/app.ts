import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { prisma } from "@muratori/database";
import { env } from "./config/env";
import { healthRoutes } from "./routes/health";
import { leadsRoutes } from "./routes/leads";
import { leadsExtraRoutes } from "./routes/leads-extra";
import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";
import { workspaceRoutes } from "./routes/workspaces";
import { settingsAdminRoutes, settingsPublicRoutes } from "./routes/settings";
import { smartFormsAdminRoutes } from "./smart-forms/admin-routes";
import { smartFormsPublicRoutes } from "./smart-forms/public-routes";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  app.decorate("prisma", prisma);

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(leadsRoutes, { prefix: "/api" });
  await app.register(leadsExtraRoutes, { prefix: "/api" });
  await app.register(settingsPublicRoutes, { prefix: "/api" });
  await app.register(workspaceRoutes, { prefix: "/api" });
  await app.register(adminRoutes, { prefix: "/api" });
  await app.register(settingsAdminRoutes, { prefix: "/api" });
  await app.register(smartFormsAdminRoutes, { prefix: "/api" });
  await app.register(smartFormsPublicRoutes, { prefix: "/api" });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}
