import { Elysia } from "elysia";

/**
 * Proxy router for Drizzle Studio
 * Proxies requests from /db/studio to http://drizzle-studio:4983
 * Handles HTML rewriting for base path issues and WebSocket bridging
 */
export const studioRouter = new Elysia({ prefix: "/db/studio" })
	.all(
		"/*",
		async ({ request, path, set }) => {
			const relativePath = path.replace("/db/studio", "") || "/";
			const url = new URL(request.url);
			const targetUrl = `http://drizzle-studio:4983${relativePath}${url.search}`;

			try {
				const response = await fetch(targetUrl, {
					method: request.method,
					headers: request.headers,
					body: request.body,
					redirect: "manual",
				});

				const contentType = response.headers.get("content-type");

				// Handle HTML rewriting to fix absolute paths
				if (contentType?.includes("text/html")) {
					let html = await response.text();

					// Replace absolute paths in href and src with proxied paths
					html = html.replace(/(href|src)="\//g, '$1="/db/studio/');

					const newHeaders = new Headers(response.headers);
					newHeaders.delete("content-length");

					return new Response(html, {
						status: response.status,
						statusText: response.statusText,
						headers: newHeaders,
					});
				}

				return response;
			} catch (error) {
				console.error("Drizzle Studio Proxy error:", error);
				set.status = 502;
				return {
					error: "Bad Gateway",
					message: "Drizzle Studio is unavailable",
				};
			}
		},
		{
			detail: {
				hide: true,
			},
		},
	)
	.all("/", async ({ request, path, set }) => {
		const relativePath = path.replace("/db/studio", "") || "/";
		const url = new URL(request.url);
		const targetUrl = `http://drizzle-studio:4983${relativePath}${url.search}`;

		try {
			const response = await fetch(targetUrl, {
				method: request.method,
				headers: request.headers,
				body: request.body,
				redirect: "manual",
			});

			const contentType = response.headers.get("content-type");

			// Handle HTML rewriting to fix absolute paths
			if (contentType?.includes("text/html")) {
				let html = await response.text();

				// Replace absolute paths in href and src with proxied paths
				html = html.replace(/(href|src)=\"\//g, '$1="/db/studio/');

				const newHeaders = new Headers(response.headers);
				newHeaders.delete("content-length");

				return new Response(html, {
					status: response.status,
					statusText: response.statusText,
					headers: newHeaders,
				});
			}

			return response;
		} catch (error) {
			console.error("Drizzle Studio Proxy error:", error);
			set.status = 502;
			return {
				error: "Bad Gateway",
				message: "Drizzle Studio is unavailable",
			};
		}
	})
	.ws("/*", {
		open(ws) {
			const path = (ws.data as any).path as string;
			const relativePath = path.replace("/db/studio", "") || "/";
			const targetWsUrl = `ws://drizzle-studio:4983${relativePath}`;

			try {
				const targetWs = new WebSocket(targetWsUrl);

				targetWs.onmessage = (event) => {
					ws.send(event.data);
				};

				targetWs.onclose = () => {
					ws.close();
				};

				targetWs.onerror = (error) => {
					console.error("Drizzle Studio Target WS error:", error);
					ws.close();
				};

				(ws.data as any).targetWs = targetWs;
			} catch (error) {
				console.error("Failed to connect to Drizzle Studio WebSocket:", error);
				ws.close();
			}
		},
		message(ws, message) {
			const targetWs = (ws.data as any).targetWs as WebSocket;
			if (targetWs && targetWs.readyState === WebSocket.OPEN) {
				targetWs.send(message as string | ArrayBuffer | Uint8Array);
			}
		},
		close(ws) {
			const targetWs = (ws.data as any).targetWs as WebSocket;
			if (targetWs) {
				targetWs.close();
			}
		},
	});
