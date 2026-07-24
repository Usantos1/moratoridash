import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { prisma } from "@muratori/database";
import { env } from "./config/env";
import { healthRoutes } from "./routes/health";
import { leadsRoutes } from "./routes/leads";

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
  await app.register(leadsRoutes, { prefix: "/api" });

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
