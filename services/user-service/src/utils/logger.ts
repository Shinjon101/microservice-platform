import { createLogger } from "@ecommerce-platform/common";
import type { Logger } from "@ecommerce-platform/common";

const logger: Logger = createLogger({ name: "user-service" });
export default logger;
