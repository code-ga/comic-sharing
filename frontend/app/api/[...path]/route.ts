export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_TARGET_URL = process.env.BACKEND_TARGET_URL;

const HOP_BY_HOP_HEADERS = new Set([
	'connection',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'te',
	'trailers',
	'transfer-encoding',
	'upgrade',
]);

export async function GET(req: NextRequest) {
	return handleRequest(req);
}

export async function POST(req: NextRequest) {
	return handleRequest(req);
}

export async function PUT(req: NextRequest) {
	return handleRequest(req);
}

export async function DELETE(req: NextRequest) {
	return handleRequest(req);
}

export async function PATCH(req: NextRequest) {
	return handleRequest(req);
}

export async function HEAD(req: NextRequest) {
	return handleRequest(req);
}

export async function OPTIONS(req: NextRequest) {
	return handleRequest(req);
}

async function handleRequest(req: NextRequest): Promise<Response> {
	if (!BACKEND_TARGET_URL) {
		console.error('BACKEND_TARGET_URL is not set');
		return NextResponse.json(
			{ error: 'Backend service is misconfigured' },
			{ status: 502 }
		);
	}

	const { pathname } = req.nextUrl;
	const proxyPath = pathname.replace(/^\/api/, '');
	const url = new URL(proxyPath + pathname.search, BACKEND_TARGET_URL);

	const headers = new Headers();
	for (const [key, value] of req.headers.entries()) {
		const lowerKey = key.toLowerCase();
		if (!HOP_BY_HOP_HEADERS.has(lowerKey)) {
			// Replicate header name case exactly; Node fetch uses native Headers
			headers.append(key, value);
		}
	}

	let body: BodyInit | null = null;
	const contentLength = req.headers.get('content-length');
	if (contentLength && Number(contentLength) > 0) {
		body = req.body;
	}

		try {
			const res = await fetch(url.toString(), {
				method: req.method,
				headers,
				body,
				redirect: 'manual',
			});

			const backendHeaders = new Headers();
			for (const [key, value] of res.headers.entries()) {
				backendHeaders.append(key, value);
			}

			const response = new Response(res.body, {
				status: res.status,
				statusText: res.statusText,
				headers: backendHeaders,
			});

			return response;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error('Proxy fetch failed:', message);
			return NextResponse.json({ error: 'Bad gateway' }, { status: 502 });
		}
}
