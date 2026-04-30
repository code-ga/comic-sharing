"use client";

// import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export default function ProtectedLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { 
		session: userSession, 
		sessionLoading,
		profile, 
		profileLoading,
		hasProfile,
		signOut: signOutMutate 
	} = useAuth();
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		if (!sessionLoading && !profileLoading) {
			// If not logged in, redirect to login (handled by better-auth usually, but good to be explicit if needed)
			// But here we assume the user IS logged in because they are in (protected)
			
			if (!userSession) {
				router.push("/login");
			} else if (!hasProfile && pathname !== "/onboarding") {
				router.push("/onboarding");
			} else if (hasProfile && pathname === "/onboarding") {
				router.push("/dashboard");
			}
		}
	}, [userSession, sessionLoading, profileLoading, hasProfile, pathname, router]);

	if (sessionLoading || profileLoading) {
		return (
			<html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
				<body className="h-full flex items-center justify-center bg-background">
					<div className="flex flex-col items-center gap-4">
						<div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
						<p className="text-muted-foreground font-medium animate-pulse">Initializing experience...</p>
					</div>
				</body>
			</html>
		);
	}

	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
					<header className="bg-background/80 backdrop-blur-sm border-b border-border">
						<div className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
							{/* Logo */}
							<Link href="/" className="flex items-center space-x-3">
								<span className="text-xl font-bold">ComicShare</span>
							</Link>
							{/* Nav links */}
							<div className="hidden md:flex md:items-center md:space-x-4">
								{userSession ? (
									<>
										<span className="text-muted-foreground">
											Hello,{" "}
											{userSession.user?.name ||
												userSession.user?.email ||
												"User"}
										</span>
										<button
											onClick={async () => {
												await signOutMutate();
												// Use next/router for client-side navigation
												// For now, we'll reload the page to update session
												window.location.href = "/";
											}}
											className="text-muted-foreground hover:text-primary"
											type="button"
										>
											Sign out
										</button>
									</>
								) : (
									<>
										<Link
											href="/login"
											className="text-muted-foreground hover:text-primary"
										>
											Sign in
										</Link>
										<Link
											href="/register"
											className="text-primary hover:text-primary/80"
										>
											Register
										</Link>
									</>
								)}
							</div>
							{/* Mobile menu button (placeholder) */}
							<div className="md:hidden">
								<button
									className="text-muted-foreground hover:text-primary"
									type="button"
								>
									Menu
								</button>
							</div>
						</div>
					</header>
					<main className="flex-1">{children}</main>
			</body>
		</html>
	);
}
