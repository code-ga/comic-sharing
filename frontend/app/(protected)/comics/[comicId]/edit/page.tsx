"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import InputField from "@/components/auth/InputField";

interface EditComicPageProps {
	params: Promise<{
		comicId: string;
	}>;
}

export default function EditComicPage({ params: paramsPromise }: EditComicPageProps) {
	const params = use(paramsPromise);
	const comicId = params.comicId;
	const router = useRouter();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [categories, setCategories] = useState("");
	const [genres, setGenres] = useState("");
	const [thumbnail, setThumbnail] = useState<File | null>(null);
	const [existingThumbnail, setExistingThumbnail] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const { data: comicData, isLoading: isComicLoading } = useQuery({
		queryKey: ["comic", comicId],
		queryFn: async () => {
			const { data, error } = await api.api.comics({ id: comicId }).get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
	});

	useEffect(() => {
		if (comicData?.data) {
			const comic = comicData.data;
			setTitle(comic.title);
			setDescription(comic.description || "");
			setCategories(comic.categories?.join(", ") || "");
			setGenres(comic.genres?.join(", ") || "");
			setExistingThumbnail(comic.thumbnail || null);
		}
	}, [comicData]);

	const updateMutation = useMutation({
		mutationFn: async () => {
			const categoryArray = categories.split(",").map(c => c.trim()).filter(c => c !== "");
			const genreArray = genres.split(",").map(g => g.trim()).filter(g => g !== "");

			const { data, error } = await api.api.comics({ id: comicId }).put({
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
		updateMutation.mutate();
	};

	if (isComicLoading) {
		return (
			<div className="max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto p-6">
			<div className="bg-background rounded-xl shadow-lg border border-border overflow-hidden">
				<div className="p-8 border-b border-border bg-muted/30">
					<h1 className="text-3xl font-bold tracking-tight">Edit Comic</h1>
					<p className="text-muted-foreground mt-2">Update the details for "{title || 'your comic'}".</p>
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
						disabled={updateMutation.isPending}
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
							disabled={updateMutation.isPending}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<InputField
							label="Categories"
							placeholder="Action, Fantasy (comma separated)"
							value={categories}
							onChange={setCategories}
							disabled={updateMutation.isPending}
						/>
						<InputField
							label="Genres"
							placeholder="Shonen, Comedy (comma separated)"
							value={genres}
							onChange={setGenres}
							disabled={updateMutation.isPending}
						/>
					</div>

					<div className="space-y-2">
						<label className="block text-sm font-medium text-muted-foreground">
							Thumbnail Image
						</label>
						
						{existingThumbnail && !thumbnail && (
							<div className="mb-4 p-2 border border-border rounded-lg bg-muted/5 inline-block">
								<p className="text-xs text-muted-foreground mb-2">Current thumbnail:</p>
								<img 
									src={existingThumbnail} 
									alt="Current thumbnail" 
									className="w-32 h-40 object-cover rounded shadow-sm"
								/>
							</div>
						)}

						<div className="mt-1 flex items-center gap-4 p-4 border border-dashed border-border rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer relative">
							<input
								type="file"
								accept="image/*"
								onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
								className="absolute inset-0 opacity-0 cursor-pointer"
								disabled={updateMutation.isPending}
							/>
							<div className="flex-1">
								{thumbnail ? (
									<div className="flex items-center gap-2">
										<div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center text-primary">
											🖼️
										</div>
										<span className="text-sm font-medium">{thumbnail.name}</span>
									</div>
								) : (
									<div className="text-center py-2">
										<p className="text-sm text-muted-foreground">Click or drag to replace cover image</p>
										<p className="text-xs text-muted-foreground/60 mt-1">Leave empty to keep existing</p>
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
							disabled={updateMutation.isPending}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-8 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={updateMutation.isPending}
						>
							{updateMutation.isPending ? "Updating..." : "Update Comic"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
