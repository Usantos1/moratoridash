import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env";

const encoder = new TextEncoder();

function jwtSecretKey() {
  const secret = env.JWT_SECRET || "muratori-dev-secret-change-me!!";
  return encoder.encode(secret);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(next, "hex"));
  } catch {
    return false;
  }
}

export type AdminTokenPayload = {
  sub: string;
  email: string;
  role: string;
};

export async function signAdminToken(payload: AdminTokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtSecretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify(token, jwtSecretKey());
  return {
    sub: String(payload.sub || ""),
    email: String(payload.email || ""),
    role: String(payload.role || "owner"),
  };
}

export function idempotencyKey(...parts: string[]): string {
  return createHmac("sha256", "muratori-delivery")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 32);
}
