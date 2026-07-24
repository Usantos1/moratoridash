import { prisma } from "@muratori/database";
import {
  ALL_PERMISSIONS,
  SYSTEM_ROLES,
  sanitizePermissions,
  type Permission,
} from "./permissions";

export type WorkspaceSummary = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  role: { id: string; slug: string; name: string } | null;
  permissions: Permission[];
};

export function slugifyWorkspace(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === "superadmin";
}

/// Workspaces visíveis para o usuário. Superadmin enxerga todos.
export async function listUserWorkspaces(userId: string, platformRole: string): Promise<WorkspaceSummary[]> {
  if (isSuperAdmin(platformRole)) {
    const workspaces = await prisma.workspace.findMany({
      orderBy: { name: "asc" },
      include: {
        memberships: { where: { userId }, include: { role: true } },
      },
    });
    return workspaces.map((workspace) => {
      const membership = workspace.memberships[0];
      return {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        active: workspace.active,
        role: membership?.role
          ? { id: membership.role.id, slug: membership.role.slug, name: membership.role.name }
          : null,
        permissions: ALL_PERMISSIONS,
      };
    });
  }

  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId, active: true, workspace: { active: true } },
    include: { workspace: true, role: true },
    orderBy: { workspace: { name: "asc" } },
  });

  return memberships.map((membership) => ({
    id: membership.workspace.id,
    slug: membership.workspace.slug,
    name: membership.workspace.name,
    active: membership.workspace.active,
    role: membership.role
      ? { id: membership.role.id, slug: membership.role.slug, name: membership.role.name }
      : null,
    permissions: sanitizePermissions(membership.role?.permissions ?? []),
  }));
}

/// Resolve o workspace da request: header/query explícito ou o primeiro disponível.
export async function resolveWorkspaceContext(
  userId: string,
  platformRole: string,
  requestedId: string | null,
): Promise<{ workspace: WorkspaceSummary | null; workspaces: WorkspaceSummary[] }> {
  const workspaces = await listUserWorkspaces(userId, platformRole);
  if (!workspaces.length) return { workspace: null, workspaces };

  if (requestedId) {
    const found =
      workspaces.find((item) => item.id === requestedId) ??
      workspaces.find((item) => item.slug === requestedId);
    return { workspace: found ?? null, workspaces };
  }

  return { workspace: workspaces[0], workspaces };
}

/// Workspace usado por rotas públicas legadas quando não há pista de tenant.
export async function defaultWorkspaceId(): Promise<string | null> {
  const workspace = await prisma.workspace.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return workspace?.id ?? null;
}

/// Descobre o workspace de uma requisição pública legada pelo hostname/slug da página.
export async function resolveLegacyWorkspaceId(hint: {
  hostname?: string | null;
  slug?: string | null;
}): Promise<string | null> {
  const hostname = hint.hostname?.trim();
  if (hostname) {
    const byDomain = await prisma.diagnosticPageConfig.findFirst({
      where: { domain: hostname, active: true },
      select: { workspaceId: true },
    });
    if (byDomain) return byDomain.workspaceId;
  }

  const slug = hint.slug?.trim();
  if (slug) {
    const bySlug = await prisma.diagnosticPageConfig.findFirst({
      where: { slug, active: true },
      select: { workspaceId: true },
    });
    if (bySlug) return bySlug.workspaceId;
  }

  return defaultWorkspaceId();
}

/// Cria workspace com cargos de sistema e (opcionalmente) o primeiro membro owner.
export async function createWorkspaceWithDefaults(input: {
  name: string;
  slug?: string | null;
  ownerUserId?: string | null;
}) {
  const baseSlug = slugifyWorkspace(input.slug || input.name) || "workspace";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: input.name.trim(),
      slug,
      roles: {
        create: SYSTEM_ROLES.map((role, index) => ({
          slug: role.slug,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: true,
          sortOrder: index,
        })),
      },
    },
    include: { roles: true },
  });

  if (input.ownerUserId) {
    const ownerRole = workspace.roles.find((role) => role.slug === "owner");
    await prisma.workspaceMembership.create({
      data: {
        workspaceId: workspace.id,
        userId: input.ownerUserId,
        roleId: ownerRole?.id ?? null,
      },
    });
  }

  return workspace;
}
