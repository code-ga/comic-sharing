import { logger } from "./lib/logger";
export const BACKEND_URL = '/api/';
export const FRONTEND_URL =
	import.meta.env.VITE_APP_URL || "http://localhost:3000";
logger.info(FRONTEND_URL);