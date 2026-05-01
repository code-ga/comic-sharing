"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export interface ChapterInfo {
	id: number;
	index: number;
	title: string;
}

interface ReaderHeaderProps {
	comicId: string;
	comicTitle: string;
	chapter: ChapterInfo;
	chapters: ChapterInfo[];
}

export default function ReaderHeader({
	comicId,
	comicTitle,
	chapter,
	chapters,
}: ReaderHeaderProps) {
	const router = useRouter();

	// Sort chapters by index
	const sortedChapters = [...chapters].sort((a, b) => a.index - b.index);
	const currentIndex = sortedChapters.findIndex((c) => c.id === chapter.id);
	const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
	const nextChapter =
		currentIndex < sortedChapters.length - 1
			? sortedChapters[currentIndex + 1]
			: null;

	return (
		<>
			{/* Top Header - Comic title & Chapter info */}
			<header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
				<div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
					{/* Back to Comic */}
					<div className="flex items-center gap-4">
						<Link
							href={`/comics/${comicId}`}
							className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
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
									d="M15 19l-7-7 7-7"
								/>
							</svg>
							{comicTitle}
						</Link>
					</div>

					{/* Chapter Title */}
					<div className="text-sm font-medium text-foreground">
						Chapter {chapter.index}: {chapter.title}
					</div>
				</div>
			</header>

			{/* Bottom Navigation Bar */}
			<div className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
				<div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
					{/* Previous Chapter */}
					{prevChapter ? (
						<Link
							href={`/comics/${comicId}/chapters/${prevChapter.id}/read`}
							className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 hover:bg-muted rounded-xl transition-all group"
						>
							<svg
								aria-hidden="true"
								className="w-4 h-4 text-muted-foreground group-hover:text-foreground"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 19l-7-7 7-7"
								/>
							</svg>
							<div className="text-left">
								<div className="text-xs text-muted-foreground">Previous</div>
								<div className="text-sm font-medium truncate max-w-30">
									Ch.{prevChapter.index}: {prevChapter.title}
								</div>
							</div>
						</Link>
					) : (
						<div className="w-32" />
					)}

					{/* Chapter Selector */}
					{sortedChapters.length > 0 && (
						<div className="flex items-center gap-2">
							<select
								value={chapter.id}
								onChange={(e) => {
									const targetChapter = sortedChapters.find(
										(c) => c.id === Number(e.target.value),
									);
									if (targetChapter) {
										router.push(
											`/comics/${comicId}/chapters/${targetChapter.id}/read`,
										);
									}
								}}
								className="px-3 py-2 bg-muted/50 rounded-lg text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary"
							>
								{sortedChapters.map((c) => (
									<option key={c.id} value={c.id}>
										Chapter {c.index}: {c.title}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Next Chapter */}
					{nextChapter ? (
						<Link
							href={`/comics/${comicId}/chapters/${nextChapter.id}/read`}
							className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all group text-right"
						>
							<div>
								<div className="text-xs text-muted-foreground">Next</div>
								<div className="text-sm font-medium truncate max-w-30">
									Ch.{nextChapter.index}: {nextChapter.title}
								</div>
							</div>
							<svg
								aria-hidden="true"
								className="w-4 h-4 text-primary"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</Link>
					) : (
						<div className="w-32" />
					)}
				</div>
			</div>
		</>
	);
}


// interface ReaderHeaderProps {
// 	comicId: string;
// 	comicTitle: string;
// 	chapter: ChapterInfo;
// 	chapters: ChapterInfo[];
// }

// export default function ReaderHeader({
// 	comicId,
// 	comicTitle,
// 	chapter,
// 	chapters,
// }: ReaderHeaderProps) {
// 	// Sort chapters by index
// 	const sortedChapters = [...chapters].sort((a, b) => a.index - b.index);
// 	const currentIndex = sortedChapters.findIndex((c) => c.id === chapter.id);
// 	const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
// 	const nextChapter =
// 		currentIndex < sortedChapters.length - 1
// 			? sortedChapters[currentIndex + 1]
// 			: null;

// 	return (
// 		<>
// 			{/* Top Header - Comic title & Chapter info */}
// 			<header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
// 				<div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
// 					{/* Back to Comic */}
// 					<div className="flex items-center gap-4">
// 						<Link
// 							href={`/comics/${comicId}`}
// 							className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
// 						>
// 							<svg
// 								aria-hidden="true"
// 								className="w-4 h-4"
// 								fill="none"
// 								stroke="currentColor"
// 								viewBox="0 0 24 24"
// 							>
// 								<path
// 									strokeLinecap="round"
// 									strokeLinejoin="round"
// 									strokeWidth={2}
// 									d="M15 19l-7-7 7-7"
// 								/>
// 							</svg>
// 							{comicTitle}
// 						</Link>
// 					</div>

// 					{/* Chapter Title */}
// 					<div className="text-sm font-medium text-foreground">
// 						Chapter {chapter.index}: {chapter.title}
// 					</div>
// 				</div>
// 			</header>

// 			{/* Bottom Navigation Bar */}
// 			<div className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
// 				<div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
// 					{/* Previous Chapter */}
// 					{prevChapter ? (
// 						<Link
// 							href={`/comics/${comicId}/chapters/${prevChapter.id}/read`}
// 							className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 hover:bg-muted rounded-xl transition-all group"
// 						>
// 							<svg
// 								aria-hidden="true"
// 								className="w-4 h-4 text-muted-foreground group-hover:text-foreground"
// 								fill="none"
// 								stroke="currentColor"
// 								viewBox="0 0 24 24"
// 							>
// 								<path
// 									strokeLinecap="round"
// 									strokeLinejoin="round"
// 									strokeWidth={2}
// 									d="M15 19l-7-7 7-7"
// 								/>
// 							</svg>
// 							<div className="text-left">
// 								<div className="text-xs text-muted-foreground">Previous</div>
// 								<div className="text-sm font-medium truncate max-w-30">
// 									Ch.{prevChapter.index}: {prevChapter.title}
// 								</div>
// 							</div>
// 						</Link>
// 					) : (
// 						<div className="w-32" />
// 					)}

// 					{/* Chapter Selector */}
// 					{sortedChapters.length > 0 && (
// 						<div className="flex items-center gap-2">
// 							<select
// 								value={chapter.id}
// 								onChange={(e) => {
// 									const targetChapter = sortedChapters.find(
// 										(c) => c.id === Number(e.target.value),
// 									);
// 									if (targetChapter) {
// 										window.location.href = `/comics/${comicId}/chapters/${targetChapter.id}/read`;
// 									}
// 								}}
// 								className="px-3 py-2 bg-muted/50 rounded-lg text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary"
// 							>
// 								{sortedChapters.map((c) => (
// 									<option key={c.id} value={c.id}>
// 										Chapter {c.index}: {c.title}
// 									</option>
// 								))}
// 							</select>
// 						</div>
// 					)}

// 					{/* Next Chapter */}
// 					{nextChapter ? (
// 						<Link
// 							href={`/comics/${comicId}/chapters/${nextChapter.id}/read`}
// 							className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all group text-right"
// 						>
// 							<div>
// 								<div className="text-xs text-muted-foreground">Next</div>
// 								<div className="text-sm font-medium truncate max-w-30">
// 									Ch.{nextChapter.index}: {nextChapter.title}
// 								</div>
// 							</div>
// 							<svg
// 								aria-hidden="true"
// 								className="w-4 h-4 text-primary"
// 								fill="none"
// 								stroke="currentColor"
// 								viewBox="0 0 24 24"
// 							>
// 								<path
// 									strokeLinecap="round"
// 									strokeLinejoin="round"
// 									strokeWidth={2}
// 									d="M9 5l7 7-7 7"
// 								/>
// 							</svg>
// 						</Link>
// 					) : (
// 						<div className="w-32" />
// 					)}
// 				</div>
// 			</div>
// 		</>
// 	);
// }
