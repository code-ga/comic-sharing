/** @jsxImportSource react */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import InputField from "@/components/auth/InputField";
import { BACKEND_URL } from "../../../../constants";

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

			const formData = new FormData();
			if (title.trim()) formData.append("title", title.trim());
			if (description.trim())
				formData.append("description", description.trim());
			if (categoryArray.length)
				categoryArray.map((data) =>
					formData.append("categories", String(data)),
				);
			if (genreArray.length)
				genreArray.map((data) => formData.append("genres", data));
			if (thumbnail) formData.append("thumbnail", thumbnail);
			const res = await fetch(`${BACKEND_URL}/api/comics`, {
				method: "POST",
				body: formData,
				credentials: "include",
				headers: {
					accept: "application/json",
				},
			});
			const data = await res.json();
			const error = res.ok ? null : data;

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
		<div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
			<div className="glass rounded-2xl border border-border/50 overflow-hidden">
				<div className="p-6 md:p-8 border-b border-border/50 bg-muted/20">
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
						Create New Comic
					</h1>
					<p className="text-muted-foreground mt-2">
						Add a new comic to the library. Fill in the details below.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
					{error && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
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
							className="block w-full rounded-xl border border-input bg-background px-4 py-3 text-sm min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
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
						<div className="mt-1 flex items-center gap-4 p-4 md:p-6 border border-dashed border-border/50 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer relative group">
							<input
								type="file"
								accept="image/*"
								onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
								className="absolute inset-0 opacity-0 cursor-pointer"
								disabled={createMutation.isPending}
							/>
							<div className="flex-1">
								{thumbnail ? (
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-lg shadow-primary/10">
											<svg
												className="w-6 h-6"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
												/>
											</svg>
										</div>
										<span className="text-sm font-medium text-foreground">
											{thumbnail.name}
										</span>
									</div>
								) : (
									<div className="text-center py-4">
										<p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
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

					<div className="pt-6 flex items-center justify-end gap-4">
						<button
							type="button"
							onClick={() => router.back()}
							className="px-6 py-2.5 text-sm font-medium hover:bg-muted/50 rounded-xl transition-all duration-200"
							disabled={createMutation.isPending}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-8 py-2.5 bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
							disabled={createMutation.isPending}
						>
							{createMutation.isPending ? (
								<span className="flex items-center gap-2">
									<svg
										className="w-4 h-4 animate-spin"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Creating...
								</span>
							) : (
								"Create Comic"
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
