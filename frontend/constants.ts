import { logger } from "./lib/logger";
export const BACKEND_URL = process.env.NEXT_BACKEND_URL ?? "http://localhost:3001";
export const FRONTEND_URL =
	process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
logger.info(FRONTEND_URL);
