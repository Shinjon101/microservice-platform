import { createApp } from "@/app";
import { env } from "@/config/env";
import logger from "@/utils/logger";

const main = async () => {
  try {
    const app = createApp();
    const port = env.AUTH_SERVICE_PORT;
    app.listen(port, () => {
      logger.info(`Auth service is running on port ${port}`);
    });
  } catch (err) {
    logger.error({ err }, "Failed to start auth service");
    process.exit(1);
  }
};
void main();
