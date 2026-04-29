"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AuthForm from "@/components/auth/AuthForm";
import InputField from "@/components/auth/InputField";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const { signIn, signInLoading, signInError } = useAuth();
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);
		try {
			await signIn({ email, password });
			// On success, redirect to home
			setSuccess("Login successful! Redirecting...");
			// Give a moment for the success message to show, then redirect
			setTimeout(() => {
				router.push("/");
			}, 1500);
		} catch (err: any) {
			setError(err.message || "An error occurred during login");
		}
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 sm:py-12">
			<AuthForm
				title="Sign in to your account"
				description="Enter your email and password to continue"
				submitText="Sign in"
				loading={signInLoading}
				onSubmit={handleSubmit}
				footerLinks={
					<div className="space-y-2 text-sm">
						<Link
							href="/forgot-password"
							className="text-muted-foreground hover:text-primary"
						>
							Forgot password?
						</Link>
						<div className="text-muted-foreground">
							Don't have an account?{" "}
							<Link
								href="/register"
								className="text-primary hover:text-primary/80"
							>
								Register
							</Link>
						</div>
					</div>
				}
			>
				<InputField
					label="Email"
					type="email"
					placeholder="Enter your email"
					value={email}
					onChange={setEmail}
					required
					error={error?.includes("email") ? error : undefined}
				/>
				<InputField
					label="Password"
					type="password"
					placeholder="Enter your password"
					value={password}
					onChange={setPassword}
					required
					error={error?.includes("password") ? error : undefined}
				/>
				<div className="relative flex py-2 items-center">
					<div className="flex-grow border-t border-input"></div>
					<span className="flex-shrink-0 mx-4 text-muted-foreground text-sm">
						or continue with
					</span>
					<div className="flex-grow border-t border-input"></div>
				</div>
				<SocialAuthButtons />
			</AuthForm>
			{error && (
				<p className="mt-4 text-sm text-destructive w-full max-w-md">{error}</p>
			)}
			{success && (
				<p className="mt-4 text-sm text-success w-full max-w-md">{success}</p>
			)}
		</div>
	);
}
