"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import InputField from "@/components/auth/InputField";

interface EditChapterPageProps {
	params: Promise<{
		comicId: string;
		chapterId: string;
	}>;
}

export default function EditChapterPage({ params: paramsPromise }: EditChapterPageProps) {
	const params = use(paramsPromise);
	const comicId = params.comicId;
	const chapterId = params.chapterId;
	const router = useRouter();

	const [title, setTitle] = useState("");
	const [indexing, setIndexing] = useState("");
	const [error, setError] = useState<string | null>(null);

	const { data: chapterData, isLoading: isChapterLoading } = useQuery({
		queryKey: ["chapter", chapterId],
		queryFn: async () => {
			const { data, error } = await api.api.chapters({ id: Number(chapterId) }).get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
	});

	useEffect(() => {
		if (chapterData?.data) {
			const chapter = chapterData.data;
			setTitle(chapter.title);
			setIndexing(chapter.index.toString());
		}
	}, [chapterData]);

	const updateMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.api.chapters({ id: Number(chapterId) }).put({
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
		updateMutation.mutate();
	};

	if (isChapterLoading) {
		return (
			<div className="max-w-xl mx-auto p-6 flex items-center justify-center min-h-[300px]">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
			</div>
		);
	}

	return (
		<div className="max-w-xl mx-auto p-6">
			<div className="bg-background rounded-xl shadow-lg border border-border overflow-hidden">
				<div className="p-8 border-b border-border bg-muted/30">
					<h1 className="text-2xl font-bold tracking-tight">Edit Chapter</h1>
					<p className="text-muted-foreground mt-1">
						Updating chapter details.
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
						disabled={updateMutation.isPending}
					/>

					<InputField
						label="Index"
						type="number"
						placeholder="Order position"
						value={indexing}
						onChange={setIndexing}
						disabled={updateMutation.isPending}
					/>

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
							{updateMutation.isPending ? "Updating..." : "Update Chapter"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
