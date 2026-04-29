import Elysia from "elysia";
import { auth } from "../libs/auth.config";

export const authRouter = new Elysia({
	name: "auth",
	prefix: "/auth",
}).mount(auth.handler);
