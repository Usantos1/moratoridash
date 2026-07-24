import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "@muratori/database";
import { hashPassword } from "../lib/auth";
import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  sanitizePermissions,
  type Permission,
} from "../lib/permissions";
import {
  createWorkspaceWithDefaults,
  isSuperAdmin,
  listUserWorkspaces,
  slugifyWorkspace,
} from "../lib/workspaces";
import { adminPreHandler, requirePermission, workspacePreHandler } from "../plugins/require-admin";
import { publicUploadUrl, saveBase64Image } from "../smart-forms/assets";

const workspaceCreateSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(60).optional(),
});

const workspaceUpdateSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  slug: z.string().min(2).max(60).optional(),
  active: z.boolean().optional(),
  logoUrl: z.string().max(2000).nullable().optional(),
  settings: z.record(z.unknown()).optional(),
});

const roleSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).optional(),
  description: z.string().max(240).nullable().optional(),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
});

const memberCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(160).optional(),
  password: z.string().min(8).max(120).optional(),
  roleId: z.string().min(1).nullable().optional(),
});

const memberUpdateSchema = z.object({
  roleId: z.string().min(1).nullable().optional(),
  active: z.boolean().optional(),
  name: z.string().min(2).max(160).optional(),
});

function randomPassword(): string {
  return `Mur${Math.random().toString(36).slice(2, 10)}${Math.floor(Math.random() * 90 + 10)}`;
}

/// Garante que o usuário pode operar no workspace da URL antes de qualquer leitura.
async function assertWorkspaceAccess(
  request: FastifyRequest,
  workspaceId: string,
): Promise<boolean> {
  if (isSuperAdmin(request.admin?.role)) return true;
  return request.workspaces?.some((item) => item.id === workspaceId) ?? false;
}

export const workspaceRoutes: FastifyPluginAsync = async (app) => {
  app.get("/workspaces", { preHandler: adminPreHandler }, async (request) => {
    const admin = request.admin!;
    const workspaces = await listUserWorkspaces(admin.sub, admin.role);
    return { items: workspaces };
  });

  app.get("/workspaces/permissions", { preHandler: adminPreHandler }, async () => {
    return { groups: PERMISSION_GROUPS };
  });

  /// Criação de workspace é restrita a superadmin da plataforma.
  app.post("/workspaces", { preHandler: adminPreHandler }, async (request, reply) => {
    const admin = request.admin!;
    if (!isSuperAdmin(admin.role)) {
      return reply.status(403).send({ error: "Apenas superadmin pode criar workspaces" });
    }
    const parsed = workspaceCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const workspace = await createWorkspaceWithDefaults({
      name: parsed.data.name,
      slug: parsed.data.slug ?? null,
      ownerUserId: admin.sub,
    });
    return reply.status(201).send(workspace);
  });

  app.get("/workspaces/:id", { preHandler: workspacePreHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await assertWorkspaceAccess(request, id))) {
      return reply.status(404).send({ error: "Workspace não encontrado" });
    }
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        _count: { select: { memberships: true, smartForms: true, leads: true } },
      },
    });
    if (!workspace) return reply.status(404).send({ error: "Workspace não encontrado" });
    return workspace;
  });

  app.patch(
    "/workspaces/:id",
    { preHandler: requirePermission("workspace.manage") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!(await assertWorkspaceAccess(request, id))) {
        return reply.status(404).send({ error: "Workspace não encontrado" });
      }
      const parsed = workspaceUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
      }
      const slug = parsed.data.slug ? slugifyWorkspace(parsed.data.slug) : undefined;
      if (parsed.data.slug && !slug) {
        return reply.status(400).send({ error: "Slug inválido" });
      }
      if (parsed.data.active === false && !isSuperAdmin(request.admin?.role)) {
        return reply.status(403).send({ error: "Apenas superadmin pode desativar workspaces" });
      }
      try {
        return await prisma.workspace.update({
          where: { id },
          data: {
            name: parsed.data.name,
            slug,
            active: parsed.data.active,
            logoUrl: parsed.data.logoUrl,
            settings: parsed.data.settings as never,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Unique constraint")) {
          return reply.status(409).send({ error: "Slug já em uso" });
        }
        throw error;
      }
    },
  );

  app.post(
    "/workspaces/:id/logo",
    { preHandler: requirePermission("workspace.manage") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!(await assertWorkspaceAccess(request, id))) {
        return reply.status(404).send({ error: "Workspace não encontrado" });
      }
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
        const workspace = await prisma.workspace.update({
          where: { id },
          data: { logoUrl: url },
        });
        return reply.status(201).send({ url, workspace });
      } catch (e) {
        return reply.status(400).send({
          error: e instanceof Error ? e.message : "Upload inválido",
        });
      }
    },
  );

  // -------------------------------------------------------------------------
  // Cargos
  // -------------------------------------------------------------------------

  app.get("/workspaces/:id/roles", { preHandler: workspacePreHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await assertWorkspaceAccess(request, id))) {
      return reply.status(404).send({ error: "Workspace não encontrado" });
    }
    const roles = await prisma.workspaceRole.findMany({
      where: { workspaceId: id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { memberships: true } } },
    });
    return { items: roles };
  });

  app.post(
    "/workspaces/:id/roles",
    { preHandler: requirePermission("roles.manage") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!(await assertWorkspaceAccess(request, id))) {
        return reply.status(404).send({ error: "Workspace não encontrado" });
      }
      const parsed = roleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
      }
      const slug = slugifyWorkspace(parsed.data.slug || parsed.data.name);
      if (!slug) return reply.status(400).send({ error: "Slug inválido" });

      const existing = await prisma.workspaceRole.findUnique({
        where: { workspaceId_slug: { workspaceId: id, slug } },
      });
      if (existing) return reply.status(409).send({ error: "Já existe um cargo com esse nome" });

      const count = await prisma.workspaceRole.count({ where: { workspaceId: id } });
      const role = await prisma.workspaceRole.create({
        data: {
          workspaceId: id,
          slug,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          permissions: sanitizePermissions(parsed.data.permissions),
          sortOrder: count,
        },
      });
      return reply.status(201).send(role);
    },
  );

  app.patch(
    "/workspaces/:id/roles/:roleId",
    { preHandler: requirePermission("roles.manage") },
    async (request, reply) => {
      const { id, roleId } = request.params as { id: string; roleId: string };
      if (!(await assertWorkspaceAccess(request, id))) {
        return reply.status(404).send({ error: "Workspace não encontrado" });
      }
      const parsed = roleSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
      }
      const role = await prisma.workspaceRole.findFirst({ where: { id: roleId, workspaceId: id } });
      if (!role) return reply.status(404).send({ error: "Cargo não encontrado" });

      const permissions =
        parsed.data.permissions === undefined
          ? undefined
          : (sanitizePermissions(parsed.data.permissions) as Permission[]);

      // O cargo owner precisa manter o controle do workspace.
      if (role.slug === "owner" && permissions && !permissions.includes("workspace.manage")) {
        return reply.status(400).send({ error: "O cargo Owner precisa manter workspace.manage" });
      }

      return prisma.workspaceRole.update({
        where: { id: roleId },
        data: {
          name: parsed.data.name,
          description: parsed.data.description === undefined ? undefined : parsed.data.description,
          permissions,
        },
      });
    },
  );

  app.delete(
    "/workspaces/:id/roles/:roleId",
    { preHandler: requirePermission("roles.manage") },
    async (request, reply) => {
      const { id, roleId } = request.params as { id: string; roleId: string };
      if (!(await assertWorkspaceAccess(request, id))) {
        return reply.status(404).send({ error: "Workspace não encontrado" });
      }
      const role = await prisma.workspaceRole.findFirst({
        where: { id: roleId, workspaceId: id },
        include: { _count: { select: { memberships: true } } },
      });
      if (!role) return reply.status(404).send({ error: "Cargo não encontrado" });
      if (role.isSystem) {
        return reply.status(400).send({ error: "Cargos padrão não podem ser excluídos" });
      }
      if (role._count.memberships > 0) {
        return reply.status(409).send({ error: "Remova os usuários deste cargo antes de excluir" });
      }
      await prisma.workspaceRole.delete({ where: { id: roleId } });
      return { ok: true };
    },
  );

  // -------------------------------------------------------------------------
  // Membros
  // -------------------------------------------------------------------------

  app.get("/workspaces/:id/members", { preHandler: workspacePreHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await assertWorkspaceAccess(request, id))) {
      return reply.status(404).send({ error: "Workspace não encontrado" });
    }
    const members = await prisma.workspaceMembership.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, active: true } },
        role: { select: { id: true, name: true, slug: true, permissions: true } },
      },
    });
    return { items: members };
  });

  app.post(
    "/workspaces/:id/members",
    { preHandler: requirePermission("users.manage") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!(await assertWorkspaceAccess(request, id))) {
        return reply.status(404).send({ error: "Workspace não encontrado" });
      }
      const parsed = memberCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
      }

      const email = parsed.data.email.trim().toLowerCase();
      if (parsed.data.roleId) {
        const role = await prisma.workspaceRole.findFirst({
          where: { id: parsed.data.roleId, workspaceId: id },
          select: { id: true },
        });
        if (!role) return reply.status(400).send({ error: "Cargo inválido para este workspace" });
      }

      let user = await prisma.adminUser.findUnique({ where: { email } });
      let temporaryPassword: string | null = null;

      if (!user) {
        temporaryPassword = parsed.data.password || randomPassword();
        user = await prisma.adminUser.create({
          data: {
            email,
            name: parsed.data.name ?? null,
            passwordHash: hashPassword(temporaryPassword),
            role: "member",
          },
        });
      }

      const existing = await prisma.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId: user.id } },
      });
      if (existing) {
        return reply.status(409).send({ error: "Usuário já participa deste workspace" });
      }

      const membership = await prisma.workspaceMembership.create({
        data: { workspaceId: id, userId: user.id, roleId: parsed.data.roleId ?? null },
        include: {
          user: { select: { id: true, name: true, email: true, role: true, active: true } },
          role: { select: { id: true, name: true, slug: true } },
        },
      });

      return reply.status(201).send({ membership, temporaryPassword });
    },
  );

  app.patch(
    "/workspaces/:id/members/:membershipId",
    { preHandler: requirePermission("users.manage") },
    async (request, reply) => {
      const { id, membershipId } = request.params as { id: string; membershipId: string };
      if (!(await assertWorkspaceAccess(request, id))) {
        return reply.status(404).send({ error: "Workspace não encontrado" });
      }
      const parsed = memberUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Dados inválidos", details: parsed.error.flatten() });
      }

      const membership = await prisma.workspaceMembership.findFirst({
        where: { id: membershipId, workspaceId: id },
      });
      if (!membership) return reply.status(404).send({ error: "Membro não encontrado" });

      if (parsed.data.roleId) {
        const role = await prisma.workspaceRole.findFirst({
          where: { id: parsed.data.roleId, workspaceId: id },
          select: { id: true },
        });
        if (!role) return reply.status(400).send({ error: "Cargo inválido para este workspace" });
      }

      if (parsed.data.active === false && membership.userId === request.admin?.sub) {
        return reply.status(400).send({ error: "Você não pode desativar o seu próprio acesso" });
      }

      if (parsed.data.name) {
        await prisma.adminUser.update({
          where: { id: membership.userId },
          data: { name: parsed.data.name },
        });
      }

      return prisma.workspaceMembership.update({
        where: { id: membershipId },
        data: {
          roleId: parsed.data.roleId === undefined ? undefined : parsed.data.roleId,
          active: parsed.data.active,
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true, active: true } },
          role: { select: { id: true, name: true, slug: true } },
        },
      });
    },
  );

  app.post(
    "/workspaces/:id/members/:membershipId/reset-password",
    { preHandler: requirePermission("users.manage") },
    async (request, reply) => {
      const { id, membershipId } = request.params as { id: string; membershipId: string };
      if (!(await assertWorkspaceAccess(request, id))) {
        return reply.status(404).send({ error: "Workspace não encontrado" });
      }
      const membership = await prisma.workspaceMembership.findFirst({
        where: { id: membershipId, workspaceId: id },
      });
      if (!membership) return reply.status(404).send({ error: "Membro não encontrado" });

      const temporaryPassword = randomPassword();
      await prisma.adminUser.update({
        where: { id: membership.userId },
        data: { passwordHash: hashPassword(temporaryPassword) },
      });
      return { temporaryPassword };
    },
  );

  app.delete(
    "/workspaces/:id/members/:membershipId",
    { preHandler: requirePermission("users.manage") },
    async (request, reply) => {
      const { id, membershipId } = request.params as { id: string; membershipId: string };
      if (!(await assertWorkspaceAccess(request, id))) {
        return reply.status(404).send({ error: "Workspace não encontrado" });
      }
      const membership = await prisma.workspaceMembership.findFirst({
        where: { id: membershipId, workspaceId: id },
      });
      if (!membership) return reply.status(404).send({ error: "Membro não encontrado" });
      if (membership.userId === request.admin?.sub) {
        return reply.status(400).send({ error: "Você não pode remover o seu próprio acesso" });
      }
      await prisma.workspaceMembership.delete({ where: { id: membershipId } });
      return { ok: true };
    },
  );
};
