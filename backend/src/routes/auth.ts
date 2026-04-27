import Elysia from "elysia";

export const authRouter = new Elysia({
	name: "auth",
	prefix: "/auth",
});
