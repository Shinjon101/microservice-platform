import { createLogger } from "@ecommerce-platform/common";
import type { Logger } from "@ecommerce-platform/common";

const logger: Logger = createLogger({ name: "gateway-service" });
export default logger;
