import Elysia from "elysia";
import { healthRoutes } from "./health";
import { profileRouter } from "./profile";
import { roleRoute } from "./role";
import { authRouter } from "./auth";
import { comicsRoute } from "./comic";
import { chaptersRoute } from "./chapters";
import { chapterImagesRoute } from "./chapterImage";

const apiRouter = new Elysia({ prefix: "/api" })
	.use(healthRoutes)
	.use(profileRouter)
	.use(authRouter)
	.use(comicsRoute)
	.use(chaptersRoute)
	.use(chapterImagesRoute)
	.use(roleRoute);

export { apiRouter };
