"use client";

import { logger } from "./lib/logger";
export const BACKEND_URL =
	process.env.NEXT_BACKEND_URL ||
	(process.env.NODE_ENV === "development"
		? "http://localhost:3001"
		: "https://mangahub-backend.nbth.id.vn");
export const FRONTEND_URL =
	process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
logger.info({ BACKEND_URL, FRONTEND_URL });
