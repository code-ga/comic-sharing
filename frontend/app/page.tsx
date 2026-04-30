"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "../lib/api";
import ComicCard, { type Comic } from "../components/ComicCard";
import Link from "next/link";

export default function Home() {
	// Fetch latest updated comics
	const latestQuery = useQuery<Comic[]>({
		queryKey: ["comics", "latest"],
		queryFn: async () => {
			const { data, error } = await api.api.comics["latest-update"].get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data.data as Comic[];
		},
	});

	// Fetch recently added comics
	const recentQuery = useQuery<Comic[]>({
		queryKey: ["comics", "recent"],
		queryFn: async () => {
			const { data, error } = await api.api.comics["recently-added"].get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data.data as Comic[];
		},
	});

	// Fetch recommended comics
	const recommendedQuery = useQuery<Comic[]>({
		queryKey: ["comics", "recommended"],
		queryFn: async () => {
			const { data, error } = await api.api.comics.recommended.get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data.data as Comic[];
		},
	});

	// Generic section component
	function ComicSection({
		title,
		query,
	}: {
		title: string;
		query: UseQueryResult<Comic[]>;
	}) {
		return (
			<section className="space-y-4">
				<div className="flex items-center justify-between px-1">
					<h2 className="text-lg md:text-xl font-bold text-foreground">
						{title}
					</h2>
					{query.isError && (
						<button
							onClick={() => query.refetch()}
							className="text-xs text-primary hover:underline"
						>
							Retry
						</button>
					)}
				</div>

				{query.isLoading ? (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="glass rounded-xl border border-border/50 overflow-hidden"
							>
								<div className="aspect-[3/4] bg-muted/50 animate-pulse" />
								<div className="p-4 space-y-3">
									<div className="h-5 bg-muted/50 rounded-lg w-3/4 animate-pulse" />
									<div className="h-4 bg-muted/50 rounded-lg w-full animate-pulse" />
								</div>
							</div>
						))}
					</div>
				) : query.isError ? (
					<div className="glass rounded-xl border border-border/50 p-6 text-center">
						<p className="text-muted-foreground text-sm">
							Failed to load comics:{" "}
							{query.error ? getEdenErrorMessage(query.error) : "Unknown error"}
						</p>
					</div>
				) : query.data && query.data.length > 0 ? (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{query.data.map((comic) => (
							<ComicCard key={comic.id} comic={comic} />
						))}
					</div>
				) : (
					<div className="glass rounded-xl border border-border/50 p-6 text-center">
						<p className="text-muted-foreground text-sm">No comics yet.</p>
					</div>
				)}
			</section>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			{/* Header */}
			<header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
				<div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<Link href="/" className="flex items-center space-x-2">
							<span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
								ComicShare
							</span>
						</Link>
						<nav className="hidden md:flex items-center space-x-6">
							<Link
								href="/login"
								className="text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								Sign in
							</Link>
							<Link
								href="/register"
								className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/80 transition-colors"
							>
								Get Started
							</Link>
						</nav>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1">
				<div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 md:py-12 space-y-10 md:space-y-12">
					{/* Hero */}
					<div className="text-center space-y-4 pb-8">
						<h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
							Discover & Share{" "}
							<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
								Amazing Comics
							</span>
						</h1>
						<p className="max-w-2xl mx-auto text-muted-foreground text-lg md:text-xl">
							A platform for comic creators and readers. Explore new stories,
							share your work, and connect with a community of enthusiasts.
						</p>
					</div>

					{/* Recommended Section (shown first) */}
					<ComicSection title="Recommended For You" query={recommendedQuery} />

					{/* Latest Updates Section */}
					<ComicSection title="Latest Updates" query={latestQuery} />

					{/* Recently Added Section */}
					<ComicSection title="New Additions" query={recentQuery} />
				</div>
			</main>

			{/* Footer */}
			<footer className="border-t border-border bg-background/50">
				<div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8">
					<div className="flex flex-col md:flex-row items-center justify-between gap-4">
						<div className="flex items-center space-x-2">
							<span className="text-lg font-bold text-foreground">ComicShare</span>
							<span className="text-muted-foreground text-sm">
								© 2026 All rights reserved.
							</span>
						</div>
						<div className="flex items-center space-x-6 text-sm text-muted-foreground">
							<Link href="#" className="hover:text-foreground transition-colors">
								About
							</Link>
							<Link href="#" className="hover:text-foreground transition-colors">
								Privacy
							</Link>
							<Link href="#" className="hover:text-foreground transition-colors">
								Terms
							</Link>
							<Link href="#" className="hover:text-foreground transition-colors">
								Contact
							</Link>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
