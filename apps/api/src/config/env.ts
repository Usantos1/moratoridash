import { config } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

// Carrega .env da raiz do monorepo (apps/api/src/config → ../../../../.env)
config({ path: resolve(__dirname, "../../../../.env") });
config(); // fallback local apps/api/.env

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
  process.exit(1);
}

export const env = parsed.data;
