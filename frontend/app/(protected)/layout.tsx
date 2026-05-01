"use client";

// import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

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
		profileLoading,
		hasProfile,
	} = useAuth();
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		if (!sessionLoading && !profileLoading) {
			if (!userSession) {
				router.push("/login");
			} else if (!hasProfile && pathname !== "/onboarding") {
				router.push("/onboarding");
			} else if (hasProfile && pathname === "/onboarding") {
				router.push("/dashboard");
			}
		}
	}, [
		userSession,
		sessionLoading,
		profileLoading,
		hasProfile,
		pathname,
		router,
	]);

	if (sessionLoading || profileLoading) {
		return (
			<html
				lang="en"
				className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
			>
				<body className="h-full flex items-center justify-center bg-background">
					<div className="flex flex-col items-center gap-4">
						<div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
						<p className="text-muted-foreground font-medium animate-pulse">
							Initializing experience...
						</p>
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
				<Navbar variant="protected" />
				<main className="flex-1">{children}</main>
			</body>
		</html>
	);
}
