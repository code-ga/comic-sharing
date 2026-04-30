"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import InputField from "@/components/auth/InputField";

interface CreateChapterPageProps {
	params: Promise<{
		comicId: string;
	}>;
}

export default function CreateChapterPage({ params: paramsPromise }: CreateChapterPageProps) {
	const params = use(paramsPromise);
	const comicId = params.comicId;
	const router = useRouter();

	const [title, setTitle] = useState("");
	const [indexing, setIndexing] = useState("");
	const [error, setError] = useState<string | null>(null);

	const { data: comicData } = useQuery({
		queryKey: ["comic", comicId],
		queryFn: async () => {
			const { data, error } = await api.api.comics({ id: comicId }).get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
	});

	const createMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.api.chapters.comic({ comicId }).post({
				title,
				indexing: indexing ? Number(indexing) : undefined,
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
			setError("Chapter title is required");
			return;
		}
		createMutation.mutate();
	};

	return (
		<div className="max-w-xl mx-auto p-6">
			<div className="bg-background rounded-xl shadow-lg border border-border overflow-hidden">
				<div className="p-8 border-b border-border bg-muted/30">
					<h1 className="text-2xl font-bold tracking-tight">Add New Chapter</h1>
					<p className="text-muted-foreground mt-1">
						For comic: <span className="font-semibold text-foreground">{comicData?.data?.title || 'Loading...'}</span>
					</p>
				</div>

				<form onSubmit={handleSubmit} className="p-8 space-y-6">
					{error && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
							{error}
						</div>
					)}

					<InputField
						label="Chapter Title"
						placeholder="e.g. Chapter 1: The Beginning"
						value={title}
						onChange={setTitle}
						required
						disabled={createMutation.isPending}
					/>

					<InputField
						label="Index (Optional)"
						type="number"
						placeholder="Auto-increment if empty"
						value={indexing}
						onChange={setIndexing}
						disabled={createMutation.isPending}
					/>
					<p className="text-xs text-muted-foreground -mt-4">
						The order position of this chapter. Leave empty to add to the end.
					</p>

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
							{createMutation.isPending ? "Creating..." : "Create Chapter"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
