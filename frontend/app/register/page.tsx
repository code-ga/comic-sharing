"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AuthForm from "@/components/auth/AuthForm";
import InputField from "@/components/auth/InputField";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";

export default function RegisterPage() {
  const { signUp, signUpLoading, createProfile, createProfileLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Basic client-side validation
    if (!email || !password || !username || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    try {
      // Step 1: Sign up user
      await signUp({ email, password });
      
      // Step 2: Create profile
      await createProfile(username);
      
      setSuccess("Registration successful! You can now log in.");
      // Clear form on success
      setEmail("");
      setPassword("");
      setUsername("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 sm:py-12">
      <AuthForm
        title="Create an account"
        description="Join the comic-sharing community"
        submitText="Register"
        loading={signUpLoading || createProfileLoading}
        onSubmit={handleSubmit}
        footerLinks={
          <div className="text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80">
              Sign in
            </Link>
          </div>
        }
      >
        <InputField
          label="Username"
          placeholder="Choose a username"
          value={username}
          onChange={setUsername}
          required
          error={error?.includes("username") ? error : undefined}
        />
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
          placeholder="Create a password"
          value={password}
          onChange={setPassword}
          required
          error={error?.includes("password") ? error : undefined}
        />
        <InputField
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          error={
            error?.includes("password") || password !== confirmPassword
              ? error || "Passwords do not match"
              : undefined
          }
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
        <p className="mt-4 text-sm text-destructive w-full max-w-md">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 text-sm text-success w-full max-w-md">
          {success}
        </p>
      )}
    </div>
  );
}
