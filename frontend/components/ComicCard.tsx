import Link from "next/link";
import Image from "next/image";

// Minimal Comic type for frontend display
export type Comic = {
	id: number;
	title: string;
	description: string | null | undefined;
	thumbnail: string | null | undefined;
	categories: string[] | undefined;
	genres?: string[] | undefined;
};

interface ComicCardProps {
	comic: Comic;
}

export default function ComicCard({ comic }: ComicCardProps) {
	return (
		<Link
			href={`/comics/${comic.id}`}
			className="group flex flex-col bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-200 overflow-hidden hover:shadow-lg hover:shadow-primary/10"
		>
			{/* Thumbnail */}
			<div className="relative aspect-[3/4] w-full bg-muted">
				{comic.thumbnail ? (
					<img
						src={comic.thumbnail}
						alt={comic.title}
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
						className="object-cover transition-transform duration-200 group-hover:scale-105"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-muted-foreground">
						<svg
							className="w-12 h-12"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
							/>
						</svg>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="flex flex-col flex-1 p-4">
				<h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
					{comic.title}
				</h3>

				{comic.description && (
					<p className="mt-2 text-xs text-muted-foreground line-clamp-2">
						{comic.description}
					</p>
				)}

				{/* Metadata */}
				<div className="mt-3 flex flex-wrap gap-1">
					{comic.categories?.slice(0, 2).map((category) => (
						<span
							key={category}
							className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
						>
							{category}
						</span>
					))}
				</div>
			</div>
		</Link>
	);
}
