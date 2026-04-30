"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import InputField from "@/components/auth/InputField";

export default function CreateComicPage() {
	const router = useRouter();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [categories, setCategories] = useState("");
	const [genres, setGenres] = useState("");
	const [thumbnail, setThumbnail] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);

	const createMutation = useMutation({
		mutationFn: async () => {
			const categoryArray = categories
				.split(",")
				.map((c) => c.trim())
				.filter((c) => c !== "");
			const genreArray = genres
				.split(",")
				.map((g) => g.trim())
				.filter((g) => g !== "");

			const { data, error } = await api.api.comics.post({
				title,
				description,
				thumbnail: thumbnail || undefined,
				categories: JSON.stringify(categoryArray),
				genres: JSON.stringify(genreArray),
			});

			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
		onSuccess: () => {
			router.push("/dashboard");
			router.refresh();
		},
		onError: (err: any) => {
			setError(err.message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!title) {
			setError("Title is required");
			return;
		}
		createMutation.mutate();
	};

	return (
		<div className="max-w-2xl mx-auto p-6">
			<div className="bg-background rounded-xl shadow-lg border border-border overflow-hidden">
				<div className="p-8 border-b border-border bg-muted/30">
					<h1 className="text-3xl font-bold tracking-tight">
						Create New Comic
					</h1>
					<p className="text-muted-foreground mt-2">
						Add a new comic to the library. Fill in the details below.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="p-8 space-y-6">
					{error && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
							{error}
						</div>
					)}

					<InputField
						label="Comic Title"
						placeholder="e.g. My Awesome Adventure"
						value={title}
						onChange={setTitle}
						required
						disabled={createMutation.isPending}
					/>

					<div className="space-y-2">
						<label className="block text-sm font-medium text-muted-foreground">
							Description
						</label>
						<textarea
							placeholder="Enter comic description..."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={createMutation.isPending}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<InputField
							label="Categories"
							placeholder="Action, Fantasy, Slice of Life (comma separated)"
							value={categories}
							onChange={setCategories}
							disabled={createMutation.isPending}
						/>
						<InputField
							label="Genres"
							placeholder="Shonen, Seinen, Comedy (comma separated)"
							value={genres}
							onChange={setGenres}
							disabled={createMutation.isPending}
						/>
					</div>

					<div className="space-y-2">
						<label className="block text-sm font-medium text-muted-foreground">
							Thumbnail Image
						</label>
						<div className="mt-1 flex items-center gap-4 p-4 border border-dashed border-border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer relative">
							<input
								type="file"
								accept="image/*"
								onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
								className="absolute inset-0 opacity-0 cursor-pointer"
								disabled={createMutation.isPending}
							/>
							<div className="flex-1">
								{thumbnail ? (
									<div className="flex items-center gap-2">
										<div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center text-primary">
											🖼️
										</div>
										<span className="text-sm font-medium">
											{thumbnail.name}
										</span>
									</div>
								) : (
									<div className="text-center py-2">
										<p className="text-sm text-muted-foreground">
											Click or drag to upload a cover image
										</p>
										<p className="text-xs text-muted-foreground/60 mt-1">
											PNG, JPG, WebP (Max 5MB)
										</p>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="pt-4 flex items-center justify-end gap-4">
						<button
							type="button"
							onClick={() => router.back()}
							className="px-6 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
							disabled={createMutation.isPending}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-8 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={createMutation.isPending}
						>
							{createMutation.isPending ? "Creating..." : "Create Comic"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
