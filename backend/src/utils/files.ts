export async function uploadImages(images: File[]): Promise<string[]> {
	const imageUrls: string[] = [];
	for (const image of images) {
		const formData = new FormData();
		formData.append("file", image);
		const response = await fetch("https://cdn.hackclub.com/api/v4/upload", {
			method: "POST",
			headers: { Authorization: process.env.CDN_API_KEY || "" },
			body: formData,
		});

		const { url } = await response.json();
		imageUrls.push(url);
	}
	return imageUrls;
}
