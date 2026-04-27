import Elysia from "elysia";
import { healthRoutes } from "./health";
import { profileRouter } from "./profile";
import { roleRoute } from "./role";
import { authRouter } from "./auth";

const apiRouter = new Elysia({ prefix: "/api" })
	.use(healthRoutes)
	.use(profileRouter)
	.use(authRouter)
	.use(roleRoute);

export { apiRouter };
