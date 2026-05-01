"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function ComicsLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="min-h-screen flex flex-col">
			{/* Main navigation */}
			<Navbar variant="public" />

			{/* Comics section breadcrumb */}
			<nav className="bg-muted/10 border-b border-border/30">
				<div className="max-w-6xl mx-auto px-4 py-2">
					<Link
						href="/"
						className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Back to Home
					</Link>
				</div>
			</nav>

			{/* Page content - child pages handle their own width/padding */}
			<main className="flex-1">{children}</main>
		</div>
	);
}