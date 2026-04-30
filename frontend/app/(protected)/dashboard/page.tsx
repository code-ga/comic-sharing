/** @jsxImportSource react */
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";
import ChapterList from "@/components/ChapterList";

export default function DashboardPage() {
	const { session: userSession } = useAuth();
	const queryClient = useQueryClient();
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const { data: comicsData, isLoading: isComicsLoading } = useQuery({
		queryKey: ["comics"],
		queryFn: async () => {
			const { data, error } = await api.api.comics.my.uploaded.get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
	});

	const deleteComicMutation = useMutation({
		mutationFn: async (id: number) => {
			const { error } = await api.api.comics({ id: id.toString() }).delete();
			if (error) throw new Error(getEdenErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["comics"] });
		},
	});

	const deleteChapterMutation = useMutation({
		mutationFn: async (id: number) => {
			const { error } = await api.api.chapters({ id }).delete();
			if (error) throw new Error(getEdenErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["comics"] });
		},
	});

	const handleDeleteComic = (id: number, title: string) => {
		if (
			window.confirm(
				`Are you sure you want to delete the comic "${title}" and all its chapters?`,
			)
		) {
			deleteComicMutation.mutate(id);
		}
	};

	const handleDeleteChapter = (id: number, title: string) => {
		if (
			window.confirm(`Are you sure you want to delete the chapter "${title}"?`)
		) {
			deleteChapterMutation.mutate(id);
		}
	};

	return (
		<div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
			{/* Header / User Info */}
			<div className="glass rounded-2xl border border-border/50 shadow-2xl shadow-primary/5 overflow-hidden">
				<div className="p-4 md:p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div className="space-y-1">
						<h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
							Dashboard
						</h1>
						<p className="text-muted-foreground text-sm md:text-base">
							Welcome back,{" "}
							<span className="text-foreground font-medium">
								{userSession?.user?.name || "Creator"}
							</span>
							.
						</p>
					</div>
					<Link
						href="/comics/create"
						className="inline-flex items-center justify-center px-5 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-200 min-w-[160px] justify-center"
					>
						<svg
							className="w-4 h-4 mr-2"
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
						Create Comic
					</Link>
				</div>
			</div>

			{/* Comics Management Section */}
			<div className="space-y-4">
				<div className="flex items-center justify-between px-1">
					<h2 className="text-lg md:text-xl font-bold text-foreground">
						Your Comics Library
					</h2>
					<span className="text-xs text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
						{comicsData?.data?.length || 0} total
					</span>
				</div>
			</div>
			{isComicsLoading ? (
				<div className="grid grid-cols-1 gap-4">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="glass rounded-2xl border border-border/50 p-4 md:p-6"
						>
							<div className="flex flex-col md:flex-row gap-4 md:gap-6">
								<div className="w-full md:w-32 h-32 md:h-44 bg-muted/50 rounded-xl animate-pulse"></div>
								<div className="flex-1 space-y-3">
									<div className="h-6 bg-muted/50 rounded-lg w-3/4 animate-pulse"></div>
									<div className="h-4 bg-muted/50 rounded-lg w-full animate-pulse"></div>
									<div className="h-4 bg-muted/50 rounded-lg w-1/2 animate-pulse"></div>
								</div>
							</div>
						</div>
					))}
				</div>
			) : comicsData?.data && comicsData.data.length > 0 ? (
				<div className="grid grid-cols-1 gap-4 md:gap-6">
					{comicsData.data.map((comic: any) => (
						<div
							key={comic.id}
							className="glass rounded-2xl border border-border/50 overflow-hidden hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300"
						>
							<div className="p-4 md:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
								{/* Thumbnail */}
								<div className="w-full lg:w-32 h-32 lg:h-44 flex-shrink-0 bg-muted/30 rounded-xl overflow-hidden border border-border/50 group">
									{comic.thumbnail ? (
										<img
											src={comic.thumbnail}
											alt={comic.title}
											className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
											<span className="text-4xl md:text-5xl font-bold text-primary/60">
												{comic.title[0]}
											</span>
										</div>
									)}
								</div>

								{/* Info & Actions */}
								<div className="flex-1 flex flex-col justify-between min-w-0">
									<div className="space-y-3">
										<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
											<h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
												{comic.title}
											</h3>
											<div className="flex gap-2 shrink-0">
												<Link
													href={`/comics/${comic.id}/edit`}
													className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 group"
													title="Edit Comic"
												>
													<svg
														className="w-5 h-5 group-hover:scale-110 transition-transform"
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
													onClick={() =>
														handleDeleteComic(comic.id, comic.title)
													}
													className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 group"
													title="Delete Comic"
													type="button"
												>
													<svg
														className="w-5 h-5 group-hover:scale-110 transition-transform"
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
										</div>
										<p className="text-sm text-muted-foreground line-clamp-2">
											{comic.description || "No description provided."}
										</p>

										{/* Categories & Genres */}
										{(comic.categories?.length > 0 ||
											comic.genres?.length > 0) && (
											<div className="flex flex-wrap gap-2 pt-2">
												{comic.categories?.map((cat: string) => (
													<span
														key={cat}
														className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
													>
														{cat}
													</span>
												))}
												{comic.genres?.map((genre: string) => (
													<span
														key={genre}
														className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full"
													>
														{genre}
													</span>
												))}
											</div>
										)}
									</div>

									<div className="mt-4 pt-4 border-t border-border/50">
										<div className="flex flex-wrap items-center gap-3">
											<Link
												href={`/comics/${comic.id}/chapters/create`}
												className="text-sm font-semibold text-primary hover:text-accent hover:underline transition-colors flex items-center gap-1"
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
														d="M12 4v16m8-8H4"
													/>
												</svg>
												Add Chapter
											</Link>
										</div>
									</div>
								</div>

								{/* Chapters List */}
								{comic.chapters && comic.chapters.length > 0 && (
									<ChapterList
										chapters={comic.chapters}
										comicId={comic.id}
										onDeleteChapter={handleDeleteChapter}
									/>
								)}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="glass rounded-2xl border border-border/50 p-6 text-center">
					<h3 className="text-xl font-bold text-foreground mb-2">
						No Comics Found
					</h3>
					<p className="text-muted-foreground mb-4">
						You haven't uploaded any comics yet. Start by creating your first
						comic!
					</p>
					<Link
						href="/comics/create"
						className="inline-flex items-center justify-center px-5 py-2 bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-200"
					>
						<svg
							className="w-4 h-4 mr-2"
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
						Create Your First Comic
					</Link>
				</div>
			)}
		</div>
	);
}
