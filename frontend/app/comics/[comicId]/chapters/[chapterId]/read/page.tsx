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

					{/* Chapter AI Analysis */}
					{chapter.summary && (
						<div className="max-w-4xl mx-auto mb-12 rounded-3xl border border-primary/20 bg-primary/5 p-6 overflow-hidden relative glass">
							<div className="absolute -top-10 -right-10 p-4 opacity-10">
								<svg className="w-48 h-48 text-primary" fill="currentColor" viewBox="0 0 24 24">
									<path d="M11.666 4.354a.75.75 0 011.334 0l1.972 3.996a.75.75 0 00.354.354l3.996 1.972a.75.75 0 010 1.334l-3.996 1.972a.75.75 0 00-.354.354l-1.972 3.996a.75.75 0 01-1.334 0l-1.972-3.996a.75.75 0 00-.354-.354l-3.996-1.972a.75.75 0 010-1.334l3.996-1.972a.75.75 0 00.354-.354l1.972-3.996zM4.75 3a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 014.75 3z" />
								</svg>
							</div>
							
							<div className="relative z-10 space-y-6">
								<div className="flex items-center gap-2">
									<svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									<h2 className="text-lg font-semibold text-foreground">Chapter Insights</h2>
									{chapter.chapterType && (
										<span className="ml-auto inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary capitalize backdrop-blur-md">
											{chapter.chapterType}
										</span>
									)}
								</div>

								<p className="text-sm leading-relaxed text-muted-foreground">
									{chapter.summary}
								</p>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-primary/10">
									{chapter.characters && chapter.characters.length > 0 && (
										<div>
											<h3 className="text-xs font-medium uppercase tracking-wider text-foreground mb-2">Key Characters</h3>
											<div className="flex flex-wrap gap-1.5">
												{chapter.characters.map((char: string, i: number) => (
													<span key={i} className="inline-flex items-center rounded-md bg-background/50 border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
														{char}
													</span>
												))}
											</div>
										</div>
									)}
									
									{chapter.themes && chapter.themes.length > 0 && (
										<div>
											<h3 className="text-xs font-medium uppercase tracking-wider text-foreground mb-2">Themes</h3>
											<div className="flex flex-wrap gap-1.5">
												{chapter.themes.map((theme: string, i: number) => (
													<span key={i} className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium border border-primary/20">
														{theme}
													</span>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

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

							const AIBox = (
								<div className="w-80 flex shrink-0 flex-col rounded-3xl border border-primary/20 bg-primary/5 p-4 h-fit sticky top-24 overflow-y-auto max-h-[calc(100vh-8rem)]">
									<div className="mb-4 flex items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											<svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
											</svg>
											<h3 className="text-base font-semibold text-foreground">
												AI Insights
											</h3>
										</div>
										{pageSubtitle?.scene_type && (
											<span className="inline-flex rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary capitalize backdrop-blur-md">
												{pageSubtitle.scene_type.replace('_', ' ')}
											</span>
										)}
									</div>

									{pageSubtitle?.summary ? (
										<div className="space-y-4 text-sm text-foreground">
											<div>
												<p className="leading-relaxed text-muted-foreground">{pageSubtitle.summary}</p>
											</div>
											
											{pageSubtitle.setting && (
												<div>
													<h4 className="font-medium text-foreground mb-1 text-xs uppercase tracking-wider">Setting</h4>
													<p className="text-muted-foreground">{pageSubtitle.setting}</p>
												</div>
											)}

											{pageSubtitle.characters && pageSubtitle.characters.length > 0 && (
												<div>
													<h4 className="font-medium text-foreground mb-1 text-xs uppercase tracking-wider">Characters</h4>
													<div className="flex flex-wrap gap-1.5">
														{pageSubtitle.characters.map((char: string, i: number) => (
															<span key={i} className="inline-flex items-center rounded-md bg-background border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
																{char}
															</span>
														))}
													</div>
												</div>
											)}

											{pageSubtitle.emotions && pageSubtitle.emotions.length > 0 && (
												<div>
													<h4 className="font-medium text-foreground mb-1 text-xs uppercase tracking-wider">Emotions</h4>
													<div className="flex flex-wrap gap-1.5">
														{pageSubtitle.emotions.map((emotion: string, i: number) => (
															<span key={i} className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-500">
																{emotion}
															</span>
														))}
													</div>
												</div>
											)}

											{pageSubtitle.action_level && (
												<div>
													<h4 className="font-medium text-foreground mb-1 text-xs uppercase tracking-wider">Action Level</h4>
													<div className="flex items-center gap-2">
														<div className="h-1.5 flex-1 bg-background border border-border rounded-full overflow-hidden">
															<div 
																className={`h-full ${pageSubtitle.action_level === 'high' ? 'bg-rose-500' : pageSubtitle.action_level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} 
																style={{ width: pageSubtitle.action_level === 'high' ? '100%' : pageSubtitle.action_level === 'medium' ? '60%' : '30%' }}
															/>
														</div>
														<span className="text-xs capitalize text-muted-foreground">{pageSubtitle.action_level}</span>
													</div>
												</div>
											)}
										</div>
									) : (
										<div className="grow rounded-3xl bg-background/50 p-4 text-sm text-muted-foreground text-center border border-border/50">
											No AI insights available for this page yet.
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
										{isOCRLeft ? OCRBox : AIBox}
									</div>

									{/* Center Column (Image) */}
									<div className="relative bg-background mx-auto w-full max-w-[800px]">
										<img
											src={page.imageUrl}
											alt={`Page ${page.pageNumber}`}
											width={800}
											height={1200}
											className="w-full h-auto rounded-md shadow-sm"
										/>
										<div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-medium rounded-full border border-white/10 shadow-lg">
											Page {page.pageNumber}
										</div>
										
										{/* Mobile Boxes Toggle or Display */}
										<div className="lg:hidden mt-4 px-4 space-y-4">
											{OCRBox}
											{AIBox}
										</div>
									</div>

									{/* Right Column */}
									<div className="hidden lg:flex justify-start">
										{!isOCRLeft ? OCRBox : AIBox}
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
