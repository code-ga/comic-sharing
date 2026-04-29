"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./globals.css";
import { useState } from "react";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

// export const metadata: Metadata = {
// 	title: "ComicShare",
// 	description: "Share and discover comics",
// };

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const [queryClient, _setQueryClient] = useState(() => new QueryClient());

	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</body>
		</html>
	);
}
