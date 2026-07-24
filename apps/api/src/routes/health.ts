import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@muratori/database";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => {
    return {
      ok: true,
      service: "muratori-api",
      version: "0.1.0",
      message: "Muratori Dash API",
      docs: {
        health: "/health",
        healthDb: "/health/db",
        leadsAutosave: "POST /api/leads/autosave",
        leadsCheck: "GET /api/leads/check-completed",
      },
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/health", async () => {
    return {
      ok: true,
      service: "muratori-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/health/db", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        ok: true,
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      reply.status(503);
      return {
        ok: false,
        database: "disconnected",
        error: error instanceof Error ? error.message : "unknown",
        timestamp: new Date().toISOString(),
      };
    }
  });
};
