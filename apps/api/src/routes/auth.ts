import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@muratori/database";
import { signAdminToken, verifyAdminToken, verifyPassword } from "../lib/auth";
import { isSuperAdmin, listUserWorkspaces } from "../lib/workspaces";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Dados inválidos" });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.adminUser.findUnique({ where: { email } });

    if (!user || !user.active || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return reply.status(401).send({ error: "E-mail ou senha inválidos" });
    }

    const workspaces = await listUserWorkspaces(user.id, user.role);
    const activeWorkspace = workspaces[0] ?? null;

    const token = await signAdminToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: activeWorkspace?.id ?? null,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: isSuperAdmin(user.role),
      },
      workspaces,
      activeWorkspaceId: activeWorkspace?.id ?? null,
      permissions: activeWorkspace?.permissions ?? [],
    };
  });

  app.get("/auth/me", async (request, reply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Não autenticado" });
    }
    try {
      const payload = await verifyAdminToken(header.slice(7));
      const user = await prisma.adminUser.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true, active: true },
      });
      if (!user || !user.active) {
        return reply.status(401).send({ error: "Usuário inativo" });
      }

      const workspaces = await listUserWorkspaces(user.id, user.role);
      const requested = request.headers["x-workspace-id"];
      const requestedId = typeof requested === "string" ? requested.trim() : "";
      const activeWorkspace =
        workspaces.find((item) => item.id === requestedId) ??
        workspaces.find((item) => item.id === payload.workspaceId) ??
        workspaces[0] ??
        null;

      return {
        user: { ...user, isSuperAdmin: isSuperAdmin(user.role) },
        workspaces,
        activeWorkspaceId: activeWorkspace?.id ?? null,
        permissions: activeWorkspace?.permissions ?? [],
      };
    } catch {
      return reply.status(401).send({ error: "Sessão inválida" });
    }
  });
};
