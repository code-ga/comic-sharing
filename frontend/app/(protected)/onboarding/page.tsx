"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function OnboardingPage() {
	const { profile, createProfile, createProfileLoading, hasProfile } = useAuth();
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (hasProfile) {
			router.push("/dashboard");
		}
	}, [hasProfile, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (username.length < 3) {
			setError("Username must be at least 3 characters long");
			return;
		}

		try {
			await createProfile(username);
			router.push("/dashboard");
		} catch (err: any) {
			setError(err.message || "Failed to create profile");
		}
	};

	if (hasProfile) return null;

	return (
		<div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
			<div className="max-w-md w-full space-y-8 bg-background p-8 rounded-2xl border border-border shadow-2xl backdrop-blur-sm relative overflow-hidden group">
				{/* Decorative elements */}
				<div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-500"></div>
				<div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500"></div>

				<div className="relative">
					<div className="text-center">
						<h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
							Welcome to ComicShare
						</h1>
						<p className="mt-3 text-muted-foreground font-medium">
							Let's get your profile set up to start sharing your stories.
						</p>
					</div>

					<form onSubmit={handleSubmit} className="mt-10 space-y-6">
						<div className="space-y-2">
							<label htmlFor="username" className="text-sm font-bold tracking-wide uppercase text-muted-foreground ml-1">
								Pick a unique username
							</label>
							<div className="relative group">
								<input
									id="username"
									type="text"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									placeholder="e.g. comic_master"
									className="block w-full px-4 py-4 bg-muted/50 border-2 border-transparent rounded-xl focus:ring-0 focus:border-primary focus:bg-background transition-all duration-300 text-lg font-medium placeholder:text-muted-foreground/50"
									required
								/>
								<div className="absolute inset-0 rounded-xl border-2 border-primary/20 pointer-events-none group-focus-within:border-primary transition-colors"></div>
							</div>
							<p className="text-xs text-muted-foreground ml-1">
								This is how other creators and readers will see you.
							</p>
						</div>

						{error && (
							<div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
								<span className="text-destructive text-lg">⚠️</span>
								<p className="text-sm font-semibold text-destructive">{error}</p>
							</div>
						)}

						<button
							type="submit"
							disabled={createProfileLoading}
							className="w-full py-4 px-6 bg-primary text-primary-foreground text-lg font-black rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none group"
						>
							{createProfileLoading ? (
								<div className="flex items-center justify-center gap-2">
									<div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
									<span>Creating Profile...</span>
								</div>
							) : (
								<div className="flex items-center justify-center gap-2">
									<span>Start Your Journey</span>
									<span className="group-hover:translate-x-1 transition-transform">→</span>
								</div>
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
