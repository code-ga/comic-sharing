import Elysia from "elysia";
import { authRouter } from "./auth";
import { chapterImagesRoute } from "./chapterImage";
import { chaptersRoute } from "./chapters";
import { comicsRoute } from "./comic";
import { healthRoutes } from "./health";
import { profileRouter } from "./profile";
import { roleRoute } from "./role";
import { queueRoute } from "./queue";

const apiRouter = new Elysia({ prefix: "/api" })
	.use(healthRoutes)
	.use(profileRouter)
	.use(authRouter)
	.use(comicsRoute)
	.use(chaptersRoute)
	.use(chapterImagesRoute)
	.use(roleRoute)
	.use(queueRoute);

export { apiRouter };
