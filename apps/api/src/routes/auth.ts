import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@muratori/database";
import {
  hashPassword,
  signAdminToken,
  verifyAdminToken,
  verifyPassword,
} from "../lib/auth";
import { isSuperAdmin, listUserWorkspaces } from "../lib/workspaces";
import { publicUploadUrl, saveBase64Image } from "../smart-forms/assets";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    avatarUrl: z.string().trim().max(2000).nullable().optional(),
    currentPassword: z.string().min(6).max(200).optional(),
    newPassword: z.string().min(8).max(200).optional(),
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Informe a senha atual para trocar a senha",
    path: ["currentPassword"],
  });

const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  active: true,
} as const;

/// Extrai o usuário autenticado do header Authorization.
async function authenticate(authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) return null;
  try {
    const payload = await verifyAdminToken(authorization.slice(7));
    const user = await prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: userSelect,
    });
    if (!user || !user.active) return null;
    return { user, payload };
  } catch {
    return null;
  }
}

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
        avatarUrl: user.avatarUrl,
        role: user.role,
        isSuperAdmin: isSuperAdmin(user.role),
      },
      workspaces,
      activeWorkspaceId: activeWorkspace?.id ?? null,
      permissions: activeWorkspace?.permissions ?? [],
    };
  });

  app.get("/auth/me", async (request, reply) => {
    const auth = await authenticate(request.headers.authorization);
    if (!auth) return reply.status(401).send({ error: "Não autenticado" });
    const { user, payload } = auth;

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
  });

  /// Perfil próprio: nome, foto e senha. Não permite mudar papel nem e-mail.
  app.patch("/auth/profile", async (request, reply) => {
    const auth = await authenticate(request.headers.authorization);
    if (!auth) return reply.status(401).send({ error: "Não autenticado" });

    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.issues[0]?.message || "Dados inválidos",
      });
    }
    const body = parsed.data;

    const data: {
      name?: string;
      avatarUrl?: string | null;
      passwordHash?: string;
    } = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl || null;

    if (body.newPassword) {
      const stored = await prisma.adminUser.findUnique({
        where: { id: auth.user.id },
        select: { passwordHash: true },
      });
      if (!stored || !verifyPassword(body.currentPassword ?? "", stored.passwordHash)) {
        return reply.status(400).send({ error: "Senha atual incorreta" });
      }
      data.passwordHash = hashPassword(body.newPassword);
    }

    if (Object.keys(data).length === 0) {
      return reply.status(400).send({ error: "Nada para atualizar" });
    }

    const updated = await prisma.adminUser.update({
      where: { id: auth.user.id },
      data,
      select: userSelect,
    });

    return { user: { ...updated, isSuperAdmin: isSuperAdmin(updated.role) } };
  });

  /// Upload da foto de perfil (data URL) — disponível a qualquer usuário logado.
  app.post("/auth/profile/avatar", async (request, reply) => {
    const auth = await authenticate(request.headers.authorization);
    if (!auth) return reply.status(401).send({ error: "Não autenticado" });

    const parsed = z
      .object({ dataUrl: z.string().min(32).max(8_000_000) })
      .safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Imagem inválida" });

    try {
      const saved = await saveBase64Image({
        dataUrl: parsed.data.dataUrl,
        maxBytes: 4 * 1024 * 1024,
      });
      const url = publicUploadUrl(saved.filename);
      const updated = await prisma.adminUser.update({
        where: { id: auth.user.id },
        data: { avatarUrl: url },
        select: userSelect,
      });
      return reply.status(201).send({
        url,
        user: { ...updated, isSuperAdmin: isSuperAdmin(updated.role) },
      });
    } catch (e) {
      return reply.status(400).send({
        error: e instanceof Error ? e.message : "Upload inválido",
      });
    }
  });
};
