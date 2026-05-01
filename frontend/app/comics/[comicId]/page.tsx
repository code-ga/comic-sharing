/** @jsxImportSource react */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import ChapterList from "@/components/ChapterList";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

// Extended Comic type with authorId and chapters for detail view
export type ComicDetail = {
	id: number;
	title: string;
	description: string | null;
	thumbnail: string | null;
	categories: string[];
	genres?: string[];
	authorId: string;
	chapters: Array<{
		id: number;
		title: string;
		index: number;
		authorId: string;
		pageIds: string[];
		createdAt: string;
		updatedAt: string;
		comicId: number;
	}>;
};

export default function ComicDetailPage() {
	const params = useParams<{ comicId: string }>();
	const comicId = params.comicId;
	const { profile } = useAuth();
	const [deletingChapterId, setDeletingChapterId] = useState<number | null>(
		null,
	);

	const queryClient = useQueryClient();

	// Fetch comic details
	const {
		data: comic,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["comic", comicId],
		queryFn: async () => {
			const { data, error } = await api.api.comics({ id: comicId }).get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data.data;
		},
	});

	// Check if current user is the author
	const isAuthor = comic?.authorId === profile?.id;

	// Delete chapter mutation
	const deleteChapterMutation = useMutation({
		mutationFn: async (chapterId: number) => {
			const { error } = await api.api.chapters({ id: chapterId }).delete();
			if (error) throw new Error(getEdenErrorMessage(error));
		},
		onSuccess: () => {
			// Invalidate comic query to refetch
			queryClient.invalidateQueries({ queryKey: ["comic", comicId] });
			queryClient.invalidateQueries({ queryKey: ["comics"] });
		},
	});

	const handleDeleteChapter = (chapterId: number, title: string) => {
		if (
			window.confirm(`Are you sure you want to delete the chapter "${title}"?`)
		) {
			setDeletingChapterId(chapterId);
			deleteChapterMutation.mutate(chapterId);
		}
	};

	if (isLoading) {
		return (
			<div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
				<div className="glass rounded-2xl border border-border/50 overflow-hidden animate-pulse">
					<div className="flex flex-col md:flex-row gap-6 p-6">
						<div className="w-full md:w-64 h-80 bg-muted/50 rounded-xl" />
						<div className="flex-1 space-y-4">
							<div className="h-10 bg-muted/50 rounded-lg w-3/4" />
							<div className="h-4 bg-muted/50 rounded-lg w-full" />
							<div className="h-4 bg-muted/50 rounded-lg w-2/3" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error || !comic) {
		return (
			<div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
				<div className="glass rounded-2xl border border-border/50 p-8 text-center">
					<h2 className="text-2xl font-bold text-foreground mb-2">
						Comic Not Found
					</h2>
					<p className="text-muted-foreground">
						{error
							? getEdenErrorMessage(error)
							: "The comic you're looking for doesn't exist."}
					</p>
					<Link
						href="/"
						className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/80 transition-colors"
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Back to Home
					</Link>
				</div>
			</div>
		);
	}
	return (
		<div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
			{/* Comic Header */}
			<div className="glass rounded-2xl border border-border/50 overflow-hidden">
				<div className="flex flex-col md:flex-row gap-6 p-6">
					{/* Thumbnail */}
					<div className="w-full md:w-64 shrink-0">
						{comic.thumbnail ? (
							<img
								src={comic.thumbnail}
								alt={comic.title}
								className="w-full h-80 object-cover rounded-xl border border-border/50"
							/>
						) : (
							<div className="w-full h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center border border-border/50">
								<span className="text-6xl font-bold text-primary/60">
									{comic.title}
								</span>
							</div>
						)}
					</div>

					{/* Comic Info */}
					<div className="flex-1 flex flex-col">
						<div className="flex items-start justify-between gap-4">
							<h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
								{comic.title}
							</h1>
							{isAuthor && (
								<Link
									href={`/comics/${comic.id}/edit`}
									className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all shrink-0"
								>
									<svg
										className="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
										/>
									</svg>
									Edit Comic
								</Link>
							)}
						</div>

						{comic.description && (
							<p className="mt-4 text-muted-foreground text-sm md:text-base leading-relaxed">
								{comic.description}
							</p>
						)}

						{/* Categories & Genres */}
						{(comic.categories?.length > 0 || comic.genres?.length > 0) && (
							<div className="flex flex-wrap gap-2 mt-4">
								{comic.categories?.map((cat) => (
									<span
										key={cat}
										className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20"
									>
										{cat}
									</span>
								))}
								{comic.genres?.map((genre) => (
									<span
										key={genre}
										className="px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full border border-accent/20"
									>
										{genre}
									</span>
								))}
							</div>
						)}

						{/* Author Badge (for readers) */}
						{!isAuthor && (
							<div className="mt-4 text-xs text-muted-foreground">
								By author #{comic.authorId}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Chapters Section */}
			<div className="space-y-4">
				<div className="flex items-center justify-between px-1">
					<h2 className="text-lg md:text-xl font-bold text-foreground">
						{isAuthor ? "Manage Chapters" : "Chapters"}
					</h2>
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
							{comic.chapters?.length || 0} chapters
						</span>
						{isAuthor && (
							<Link
								href={`/comics/${comic.id}/chapters/create`}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/80 transition-all"
							>
								<svg
									className="w-3.5 h-3.5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 4v16m8-8H4"
									/>
								</svg>
								Add Chapter
							</Link>
						)}
					</div>
				</div>

				{/* Chapters Grid/List */}
				{comic.chapters && comic.chapters.length > 0 ? (
					<div className="space-y-2">
						{[...(comic?.chapters || [])]
							.sort((a, b) => a.index - b.index)
							.map((chapter) => {
								// Determine link destination based on role
								const href = isAuthor
									? `/comics/${comic.id}/chapters/${chapter.id}/edit`
									: `/comics/${comic.id}/chapters/${chapter.id}/read`;

								return (
									<div
										key={chapter.id}
										className="group flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50 hover:border-primary/30 transition-all"
									>
										{/* Chapter Info */}
										<Link href={href} className="flex-1 min-w-0">
											<div className="flex items-center gap-3">
												<span className="text-primary font-mono text-sm font-bold">
													#{chapter.index}
												</span>
												<span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
													{chapter.title}
												</span>
											</div>
											{!isAuthor && (
												<p className="text-xs text-muted-foreground mt-1">
													{chapter.pageIds?.length || 0} pages
												</p>
											)}
										</Link>

										{/* Author Actions */}
										{isAuthor && (
											<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<Link
													href={`/comics/${comic.id}/chapters/${chapter.id}/edit`}
													className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
													title="Edit Chapter"
												>
													<svg
														className="w-4 h-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
														/>
													</svg>
												</Link>
												<button
													onClick={(e) => {
														e.preventDefault(); // Prevent Link navigation when clicking delete
														handleDeleteChapter(chapter.id, chapter.title);
													}}
													className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
													title="Delete Chapter"
													type="button"
													disabled={deleteChapterMutation?.isPending}
												>
													<svg
														className="w-4 h-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
														/>
													</svg>
												</button>
											</div>
										)}
									</div>
								);
							})}
					</div>
				) : (
					<div className="glass rounded-2xl border border-border/50 p-8 text-center">
						<p className="text-muted-foreground">
							{isAuthor
								? "No chapters yet. Create your first chapter to get started!"
								: "No chapters available yet."}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
