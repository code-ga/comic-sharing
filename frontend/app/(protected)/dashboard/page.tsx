"use client";

import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";

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
		if (window.confirm(`Are you sure you want to delete the comic "${title}" and all its chapters?`)) {
			deleteComicMutation.mutate(id);
		}
	};

	const handleDeleteChapter = (id: number, title: string) => {
		if (window.confirm(`Are you sure you want to delete the chapter "${title}"?`)) {
			deleteChapterMutation.mutate(id);
		}
	};

	return (
		<div className="max-w-6xl mx-auto p-6 space-y-8">
			{/* Header / User Info */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background rounded-xl shadow-sm border border-border p-6">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground">Welcome back, {userSession?.user?.name || "User"}.</p>
				</div>
				<Link 
					href="/comics/create"
					className="inline-flex items-center justify-center px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg shadow-sm hover:shadow-md hover:bg-primary/90 transition-all"
				>
					+ Create New Comic
				</Link>
			</div>

			{/* Comics Management Section */}
			<div className="space-y-4">
				<h2 className="text-xl font-semibold px-1">Your Comics Library</h2>
				
				{isComicsLoading ? (
					<div className="grid grid-cols-1 gap-4">
						{[1, 2, 3].map(i => (
							<div key={i} className="h-32 bg-muted animate-pulse rounded-xl border border-border"></div>
						))}
					</div>
				) : comicsData?.data && comicsData.data.length > 0 ? (
					<div className="grid grid-cols-1 gap-6">
						{comicsData.data.map((comic: any) => (
							<div key={comic.id} className="bg-background rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
								<div className="p-6 flex flex-col md:flex-row gap-6">
									{/* Thumbnail */}
									<div className="w-full md:w-32 h-44 flex-shrink-0 bg-muted rounded-lg overflow-hidden border border-border">
										{comic.thumbnail ? (
											<img src={comic.thumbnail} alt={comic.title} className="w-full h-full object-cover" />
										) : (
											<div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl font-bold">
												{comic.title[0]}
											</div>
										)}
									</div>

									{/* Info & Actions */}
									<div className="flex-1 flex flex-col justify-between">
										<div>
											<div className="flex items-start justify-between">
												<h3 className="text-xl font-bold">{comic.title}</h3>
												<div className="flex gap-2">
													<Link 
														href={`/comics/${comic.id}/edit`}
														className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
														title="Edit Comic"
													>
														✏️
													</Link>
													<button 
														onClick={() => handleDeleteComic(comic.id, comic.title)}
														className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
														title="Delete Comic"
														type="button"
													>
														🗑️
													</button>
												</div>
											</div>
											<p className="text-sm text-muted-foreground line-clamp-2 mt-1">{comic.description || "No description provided."}</p>
											
											{/* Categories & Genres */}
											<div className="flex flex-wrap gap-2 mt-3">
												{comic.categories?.map((cat: string) => (
													<span key={cat} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
														{cat}
													</span>
												))}
												{comic.genres?.map((genre: string) => (
													<span key={genre} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-full">
														{genre}
													</span>
												))}
											</div>
										</div>

										<div className="mt-4 flex flex-wrap items-center gap-3">
											<Link 
												href={`/comics/${comic.id}/chapters/create`}
												className="text-sm font-semibold text-primary hover:underline"
											>
												+ Add Chapter
											</Link>
										</div>
									</div>
								</div>

								{/* Chapters List */}
								{comic.chapters && comic.chapters.length > 0 && (
									<div className="bg-muted/30 border-t border-border p-4">
										<h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">Chapters</h4>
										<div className="space-y-1">
											{comic.chapters.sort((a: any, b: any) => a.index - b.index).map((chapter: any) => (
												<div key={chapter.id} className="group flex items-center justify-between p-2 hover:bg-background rounded-lg transition-colors">
													<span className="text-sm">
														<span className="text-muted-foreground mr-2 font-mono">#{chapter.index}</span>
														{chapter.title}
													</span>
													<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
														<Link 
															href={`/comics/${comic.id}/chapters/${chapter.id}/edit`}
															className="p-1 text-muted-foreground hover:text-primary rounded"
														>
															✏️
														</Link>
														<button 
															onClick={() => handleDeleteChapter(chapter.id, chapter.title)}
															className="p-1 text-muted-foreground hover:text-destructive rounded"
															type="button"
														>
															🗑️
														</button>
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
						<p className="text-muted-foreground mb-4">You haven't created any comics yet.</p>
						<Link href="/comics/create" className="text-primary font-bold hover:underline">
							Start by creating your first comic
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}
