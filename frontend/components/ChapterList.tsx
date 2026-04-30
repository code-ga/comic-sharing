import type { SchemaType } from "../lib/api";

interface ChapterListProps {
	chapters: SchemaType["chapters"][];
	comicId: string;
	onDeleteChapter: (id: number, title: string) => void;
}

export default function ChapterList({
	chapters,
	comicId,
	onDeleteChapter,
}: ChapterListProps) {
	return (
		<div className="bg-muted/20 border-t border-border/50 p-4 md:p-6">
			<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
				Chapters ({chapters.length})
			</h4>
			<div className="space-y-2 max-h-48 overflow-y-auto">
				{chapters
					.sort((a, b) => a.index - b.index)
					.map((chapter) => (
						<div
							key={chapter.id}
							className="group flex items-center justify-between p-3 bg-background/30 rounded-xl hover:bg-background/50 transition-all duration-200"
						>
							<span className="text-sm font-medium text-foreground truncate">
								<span className="text-primary font-mono text-xs mr-2">
									#{chapter.index}
								</span>
								{chapter.title}
							</span>
							<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<a
									href={`/comics/${comicId}/chapters/${chapter.id}/edit`}
									className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
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
								</a>
								<button
									onClick={() => onDeleteChapter(chapter.id, chapter.title)}
									className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
									title="Delete Chapter"
									type="button"
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
						</div>
					))}
			</div>
		</div>
	);
}
