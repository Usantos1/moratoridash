import { buildApp } from "./app";
import { env } from "./config/env";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ host: env.API_HOST, port: env.API_PORT });
    app.log.info(`Muratori API em http://${env.API_HOST}:${env.API_PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
