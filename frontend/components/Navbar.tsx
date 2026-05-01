"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export type NavbarVariant = "public" | "protected";

interface NavbarProps {
	variant?: NavbarVariant;
}

export default function Navbar({ variant = "public" }: NavbarProps) {
	const { session: userSession, signOut, signOutLoading } = useAuth();

	const isPublic = variant === "public";

	return (
		<header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
			<div className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
				{/* Logo */}
				<Link href="/" className="flex items-center space-x-3">
					<span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
						ComicShare
					</span>
				</Link>

				{/* Nav links - Desktop */}
				<div className="hidden md:flex md:items-center md:space-x-4">
					{isPublic ? (
						<>
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
						</>
					) : (
						<>
							{userSession && (
								<span className="text-muted-foreground">
									Hello,{" "}
									{userSession.user?.name ||
										userSession.user?.email ||
										"Creator"}
									.
								</span>
							)}
							<button
								onClick={async () => {
									await signOut();
									window.location.href = "/";
								}}
								className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
								type="button"
								disabled={signOutLoading}
							>
								{signOutLoading ? "Signing out..." : "Sign out"}
							</button>
						</>
					)}
				</div>

				{/* Mobile menu button */}
				<div className="md:hidden">
					<button
						className="text-muted-foreground hover:text-primary transition-colors"
						type="button"
						aria-label="Toggle menu"
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 6h16M4 12h16M4 18h16"
							/>
						</svg>
					</button>
				</div>
			</div>
		</header>
	);
}
