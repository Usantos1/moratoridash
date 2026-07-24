import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const candidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  // dist/config → ../../../../ = raiz do monorepo
  resolve(__dirname, "../../../../.env"),
  // src/config (tsx) → mesmo caminho relativo
  resolve(__dirname, "../../../.env"),
];

let loadedFrom: string | null = null;
for (const path of candidates) {
  if (existsSync(path)) {
    config({ path });
    loadedFrom = path;
    break;
  }
}

// Fallback: variáveis já exportadas no shell/PM2
config();

if (process.env.NODE_ENV !== "production" || !process.env.DATABASE_URL) {
  if (loadedFrom) {
    console.log(`✅ .env carregado de: ${loadedFrom}`);
  } else {
    console.warn("⚠️  Nenhum arquivo .env encontrado; usando process.env");
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().default(3340),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  console.error("CWD:", process.cwd());
  console.error("Tried:", candidates);
  process.exit(1);
  throw new Error("Invalid env");
}

export const env = parsed.data;
