import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAdminToken, type AdminTokenPayload } from "../lib/auth";

declare module "fastify" {
  interface FastifyRequest {
    admin?: AdminTokenPayload;
  }
}

export function getBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function adminPreHandler(request: FastifyRequest, reply: FastifyReply) {
  const token = getBearerToken(request);
  if (!token) {
    return reply.status(401).send({ error: "Não autenticado" });
  }
  try {
    request.admin = await verifyAdminToken(token);
  } catch {
    return reply.status(401).send({ error: "Sessão inválida ou expirada" });
  }
}
