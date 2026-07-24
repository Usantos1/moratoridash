import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAdminToken, type AdminTokenPayload } from "../lib/auth";
import type { Permission } from "../lib/permissions";
import { isSuperAdmin, resolveWorkspaceContext, type WorkspaceSummary } from "../lib/workspaces";

declare module "fastify" {
  interface FastifyRequest {
    admin?: AdminTokenPayload;
    workspace?: WorkspaceSummary;
    workspaces?: WorkspaceSummary[];
  }
}

export function getBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

async function authenticate(request: FastifyRequest): Promise<{ status: number; error: string } | null> {
  const token = getBearerToken(request);
  if (!token) return { status: 401, error: "Não autenticado" };
  try {
    request.admin = await verifyAdminToken(token);
    return null;
  } catch {
    return { status: 401, error: "Sessão inválida ou expirada" };
  }
}

function requestedWorkspaceId(request: FastifyRequest): string | null {
  const header = request.headers["x-workspace-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const query = request.query as Record<string, unknown> | undefined;
  const fromQuery = query?.workspaceId;
  if (typeof fromQuery === "string" && fromQuery.trim()) return fromQuery.trim();
  return request.admin?.workspaceId ?? null;
}

async function attachWorkspace(request: FastifyRequest): Promise<{ status: number; error: string } | null> {
  const admin = request.admin!;
  const { workspace, workspaces } = await resolveWorkspaceContext(
    admin.sub,
    admin.role,
    requestedWorkspaceId(request),
  );

  request.workspaces = workspaces;

  if (!workspace) {
    return { status: 403, error: "Nenhum workspace disponível para este usuário" };
  }
  if (!workspace.active && !isSuperAdmin(admin.role)) {
    return { status: 403, error: "Workspace inativo" };
  }

  request.workspace = workspace;
  return null;
}

export async function adminPreHandler(request: FastifyRequest, reply: FastifyReply) {
  const failure = await authenticate(request);
  if (failure) return reply.status(failure.status).send({ error: failure.error });
}

/// Autentica e resolve o workspace ativo da request.
export async function workspacePreHandler(request: FastifyRequest, reply: FastifyReply) {
  const authFailure = await authenticate(request);
  if (authFailure) return reply.status(authFailure.status).send({ error: authFailure.error });

  const workspaceFailure = await attachWorkspace(request);
  if (workspaceFailure) {
    return reply.status(workspaceFailure.status).send({ error: workspaceFailure.error });
  }
}

export function hasPermission(request: FastifyRequest, permission: Permission): boolean {
  if (isSuperAdmin(request.admin?.role)) return true;
  return request.workspace?.permissions.includes(permission) ?? false;
}

/// preHandler que exige autenticação, workspace ativo e uma permissão específica.
export function requirePermission(permission: Permission) {
  return async function permissionPreHandler(request: FastifyRequest, reply: FastifyReply) {
    const authFailure = await authenticate(request);
    if (authFailure) return reply.status(authFailure.status).send({ error: authFailure.error });

    const workspaceFailure = await attachWorkspace(request);
    if (workspaceFailure) {
      return reply.status(workspaceFailure.status).send({ error: workspaceFailure.error });
    }

    if (!hasPermission(request, permission)) {
      return reply.status(403).send({ error: "Sem permissão para esta ação" });
    }
  };
}

export function currentWorkspaceId(request: FastifyRequest): string {
  const id = request.workspace?.id;
  if (!id) throw new Error("Workspace não resolvido para esta request");
  return id;
}
