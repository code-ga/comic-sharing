"use client";


import { createAuthClient } from "better-auth/react";
import { BACKEND_URL } from "../constants";
export const authClient = createAuthClient({
	baseURL: BACKEND_URL,
	fetchOptions: {
		onSuccess: (ctx) => {
			const authToken = ctx.response.headers.get("set-auth-token"); // get the token from the response headers
			// Store the token securely (e.g., in localStorage)
			if (authToken) {
				localStorage.setItem("bearer_token", authToken);
			}
		},
	},
});
