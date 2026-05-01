import { logger } from "./lib/logger";
export const BACKEND_URL =
	import.meta.env.NEXT_BACKEND_URL || "http://localhost:3001";
export const FRONTEND_URL =
	import.meta.env.NEXT_PUBLIC_URL || "http://localhost:3000";
logger.info({ env: import.meta.env, processEnv: process.env });
logger.info({ BACKEND_URL, FRONTEND_URL });
