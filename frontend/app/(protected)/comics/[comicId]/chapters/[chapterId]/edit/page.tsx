/** @jsxImportSource react */
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
				<div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto p-4 md:p-6 lg:p-8">
			<div className="glass rounded-2xl border border-border/50 overflow-hidden">
				<div className="p-6 md:p-8 border-b border-border/50 bg-muted/20">
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
						Edit Chapter
					</h1>
					<p className="text-muted-foreground mt-2">
						Updating chapter details.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
					{error && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
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

					<div className="pt-6 flex items-center justify-end gap-4">
						<button
							type="button"
							onClick={() => router.back()}
							className="px-6 py-2.5 text-sm font-medium hover:bg-muted/50 rounded-xl transition-all duration-200"
							disabled={updateMutation.isPending}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-8 py-2.5 bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
							disabled={updateMutation.isPending}
						>
							{updateMutation.isPending ? (
								<span className="flex items-center gap-2">
									<svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Updating...
								</span>
							) : (
								"Update Chapter"
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}