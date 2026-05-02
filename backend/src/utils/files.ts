import * as crypto from "node:crypto";
import type Stream from "node:stream";

export async function uploadImages(images: File[]): Promise<string[]> {
	const imageUrls: string[] = [];
	for (const image of images) {
		const formData = new FormData();
		formData.append("file", image);
		const response = await fetch("https://cdn.hackclub.com/api/v4/upload", {
			method: "POST",
			headers: { Authorization: `Bearer ${process.env.CDN_API_KEY}` },
			body: formData,
		});
		const data = await response.json();
		console.log(data);
		imageUrls.push(data.url);
	}
	return imageUrls;
}

export async function removeImage(images: string[]) {
	const results = [];
	for (const url of images) {
		const match = url.match(/https:\/\/cdn\.hackclub\.com\/([^/]+)\/[^/]+/);
		if (match) {
			const id = match[1];
			const response = await fetch(
				`https://cdn.hackclub.com/api/v4/upload/${id}`,
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${process.env.CDN_API_KEY}` },
				},
			);
			const result = await response.json();
			results.push(result);
		}
	}
	return results;
}

export function calculateFileHash(stream: Stream) {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash("sha256");

		stream.on("data", (data) => hash.update(data));
		stream.on("end", () => resolve(hash.digest("hex")));
		stream.on("error", (err) => reject(err));
	});
}
