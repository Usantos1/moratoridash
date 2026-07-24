/**
 * Entrypoint de produção: carrega .env da raiz antes de subir a API.
 * Uso: node apps/api/start.js  (cwd = /var/www/muratori)
 */
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { config } = require("dotenv");

const rootEnv = resolve(__dirname, "../../.env");
const cwdEnv = resolve(process.cwd(), ".env");

if (existsSync(cwdEnv)) {
  config({ path: cwdEnv });
} else if (existsSync(rootEnv)) {
  config({ path: rootEnv });
} else {
  console.error("❌ .env não encontrado em", cwdEnv, "nem", rootEnv);
  process.exit(1);
}

require("./dist/server.js");
