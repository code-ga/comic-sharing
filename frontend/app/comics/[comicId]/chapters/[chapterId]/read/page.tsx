"use client";

import { useQuery } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import Link from "next/link";
import { use } from "react";
import ReaderHeader from "@/components/ReaderHeader";

interface ReadChapterPageProps {
	params: Promise<{
		comicId: string;
		chapterId: string;
	}>;
}

export default function ReadChapterPage({
	params: paramsPromise,
}: ReadChapterPageProps) {
	const params = use(paramsPromise);
	const comicId = params.comicId;
	const chapterId = params.chapterId;
	// Fetch chapter data with pages
	const {
		data: chapterData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["chapter", chapterId],
		queryFn: async () => {
			const { data, error } = await api.api
				.chapters({ id: Number(chapterId) })
				.get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data.data;
		},
	});

	// Fetch comic for navigation and title
	const { data: comicData } = useQuery({
		queryKey: ["comic", comicId],
		queryFn: async () => {
			const { data, error } = await api.api.comics({ id: comicId }).get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data.data;
		},
	});

	// Fetch all chapters for navigation
	const { data: chaptersData } = useQuery({
		queryKey: ["chapters", comicId],
		queryFn: async () => {
			const { data, error } = await api.api.chapters.comic({ comicId }).get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data.data;
		},
	});

	const chapter = chapterData;
	const comic = comicData;
	const chapters = chaptersData || [];

	const {
		data: chapterPagesData,
		isLoading: isPagesLoading,
		error: pagesError,
	} = useQuery({
		queryKey: ["chapterPages", chapterId],
		queryFn: async () => {
			const { data, error } = await api.api["chapter-images"]
				.chapter({ "chapter-id": Number(chapterId) })
				.get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data.data;
		},
	});

	const chapterPages = chapterPagesData || [];
	const sortedPages = [...chapterPages].sort(
		(a, b) => a.pageNumber - b.pageNumber,
	);

	if (isLoading || isPagesLoading) {
		return (
			<div className="min-h-screen flex flex-col">
				{/* Header Skeleton */}
				<div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
					<div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
						<div className="h-6 bg-muted/50 rounded w-32 animate-pulse" />
						<div className="h-8 bg-muted/50 rounded w-24 animate-pulse" />
					</div>
				</div>

				{/* Content Skeleton */}
				<div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-4">
					<div className="h-8 bg-muted/50 rounded-lg w-3/4 animate-pulse" />
					{[1, 2, 3, 4, 5].map((i) => (
						<div
							key={i}
							className="w-full bg-muted/50 rounded-lg animate-pulse"
							style={{ aspectRatio: "3/4" }}
						/>
					))}
				</div>
			</div>
		);
	}

	if (error || pagesError || !chapter || !comic) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="glass rounded-2xl border border-border/50 p-8 text-center max-w-md">
					<h2 className="text-2xl font-bold text-foreground mb-2">
						Chapter Not Found
					</h2>
					<p className="text-muted-foreground mb-6">
						{error
							? getEdenErrorMessage(error)
							: "This chapter doesn't exist or has been removed."}
					</p>
					<Link
						href={`/comics/${comicId}`}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/80 transition-colors"
					>
						<svg
							aria-hidden="true"
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
						Back to Comic
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-background">
			{/* Reader Header */}
			<ReaderHeader
				comicId={comicId}
				comicTitle={comic?.title || "Comic"}
				chapter={{
					id: Number(chapterId),
					index: chapter.index,
					title: chapter.title,
				}}
				chapters={(chapters || []).map((c) => ({
					id: c.id,
					index: c.index,
					title: c.title,
				}))}
			/>

			{/* Main Reading Area */}
			<main className="flex-1">
				<div className="max-w-[1600px] mx-auto w-full px-4 py-6 space-y-4">
					{/* Chapter Title */}
					<div className="text-center space-y-2 mb-8">
						<h1 className="text-2xl font-bold text-foreground">
							Chapter {chapter.index}: {chapter.title}
						</h1>
						<p className="text-sm text-muted-foreground">{comic.title}</p>
					</div>

					{/* Reading Mode Toggle (Bilingual/Original) */}
					<div className="flex justify-center mb-4">
						<div className="inline-flex items-center gap-2 p-1 bg-muted/30 rounded-xl">
							<button
								type="button"
								className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg"
							>
								Original
							</button>
							<button
								type="button"
								className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors"
								disabled
							>
								Translation
							</button>
						</div>
					</div>

					{/* Pages */}
					<div className="space-y-0">
						{sortedPages.map((page) => {
							const pageSubtitle = page.subtitle?.[0];
							const pageContent = pageSubtitle?.content?.trim();
							const isOCRLeft = page.id % 2 === 0;

							const OCRBox = (
								<div className="w-80 flex shrink-0 flex-col rounded-3xl border border-border/50 bg-background/60 p-4 h-fit sticky top-24">
									<div className="mb-4 flex items-center justify-between gap-3">
										<div>
											<h3 className="text-base font-semibold text-foreground">
												OCR for page {page.pageNumber}
											</h3>
											<p className="text-xs text-muted-foreground">
												{pageSubtitle?.boxs?.boxs.length
													? `${pageSubtitle.boxs.boxs.length} boxes detected`
													: "No OCR available yet."}
											</p>
										</div>
										{pageSubtitle?.boxs?.boxs.length ? (
											<span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
												{pageSubtitle.boxs.boxs.length} boxes
											</span>
										) : null}
									</div>

									{pageContent ? (
										<pre className="whitespace-pre-wrap wrap-break-word grow rounded-3xl bg-muted/70 p-4 text-sm leading-6 text-foreground max-h-[60vh] overflow-y-auto">
											{pageContent}
										</pre>
									) : (
										<div className="grow rounded-3xl bg-muted/70 p-4 text-sm text-muted-foreground">
											No OCR result available for this page yet.
										</div>
									)}
								</div>
							);

							return (
								<div
									key={page.id}
									className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-8 items-start bg-background"
								>
									{/* Left Column */}
									<div className="hidden lg:flex justify-end">
										{isOCRLeft ? OCRBox : <div className="w-80" />}
									</div>

									{/* Center Column (Image) */}
									<div className="relative bg-background mx-auto w-full max-w-[800px]">
										<img
											src={page.imageUrl}
											alt={`Page ${page.pageNumber}`}
											width={800}
											height={1200}
											className="w-full h-auto"
										/>
										<div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-medium rounded-full border border-white/10">
											Page {page.pageNumber}
										</div>
										
										{/* Mobile OCR Toggle or Display */}
										<div className="lg:hidden mt-4 px-4">
											{OCRBox}
										</div>
									</div>

									{/* Right Column */}
									<div className="hidden lg:flex justify-start">
										{!isOCRLeft ? OCRBox : <div className="w-80" />}
									</div>
								</div>
							);
						})}
					</div>

					{/* No Pages Message */}
					{sortedPages.length === 0 && (
						<div className="glass rounded-xl border border-border/50 p-8 text-center">
							<p className="text-muted-foreground">
								No pages available for this chapter.
							</p>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
