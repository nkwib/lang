import { createApp } from "./app";
import { loadConfig } from "./lib/config";

const config = loadConfig();

async function start() {
  const app = await createApp(config);

  await app.listen({
    host: config.host,
    port: config.port,
  });

  app.log.info(`API server listening on http://${config.host}:${config.port}`);
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
