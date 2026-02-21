import { createApp } from "./app";
import { logger } from "./common/logger";
import { env } from "./config/env";

const app = createApp();

app.listen(env.port, () => {
  logger.info("server.started", {
    port: env.port,
    nodeEnv: env.nodeEnv,
  });
});
