"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getEdenErrorMessage } from "../lib/api";
import { authClient } from "../lib/auth";

export const useAuth = () => {
	const queryClient = useQueryClient();

	const sessionQuery = useQuery({
		queryKey: ["session"],
		queryFn: async () => {
			const response = await authClient.getSession();
			return response.data;
		},
	});

	const signInMutation = useMutation({
		mutationFn: async (credentials: { email: string; password: string }) => {
			const response = await authClient.signIn.email(
				{
					email: credentials.email,
					password: credentials.password,
				},
				{
					onSuccess: (ctx) => {
						const authToken = ctx.response.headers.get("set-auth-token");
						if (authToken) {
							localStorage.setItem("bearer_token", authToken);
						}
					},
				},
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session"] });
		},
		onError: (error) => {
			throw new Error(getEdenErrorMessage(error));
		},
	});

	const signUpMutation = useMutation({
		mutationFn: async (userData: { email: string; password: string }) => {
			const response = await authClient.signUp.email(
				{
					email: userData.email,
					password: userData.password,
					name: userData.email.split("@")[0],
				},
				{
					onSuccess: (ctx) => {
						const authToken = ctx.response.headers.get("set-auth-token");
						if (authToken) {
							localStorage.setItem("bearer_token", authToken || "");
						}
					},
				},
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["session"] });
		},
		onError: (error) => {
			throw new Error(getEdenErrorMessage(error));
		},
	});

	const createProfileMutation = useMutation({
		mutationFn: async (username: string) => {
			const response = await api.api.profile.post({
				username,
			});
			return response.data;
		},
		onError: (error) => {
			throw new Error(getEdenErrorMessage(error));
		},
	});

	const signOutMutation = useMutation({
		mutationFn: async () => {
			const response = await authClient.signOut();
			return response.data;
		},
		onSuccess: () => {
			queryClient.removeQueries({ queryKey: ["session"] });
		},
		onError: (error) => {
			throw new Error(getEdenErrorMessage(error));
		},
	});

	// OAuth social sign-in - triggers redirect to OAuth provider
	const signInWithOAuth = (provider: "google" | "github" | "discord") => {
		authClient.signIn.social({ provider });
	};

	// Helper properties to access mutation states
	const signInState = signInMutation;
	const signUpState = signUpMutation;
	const createProfileState = createProfileMutation;
	const signOutState = signOutMutation;

	return {
		session: sessionQuery.data,
		sessionLoading: sessionQuery.isLoading,
		sessionError: sessionQuery.error,
		signIn: signInState.mutateAsync,
		signInLoading: signInState.isPending,
		signInError: signInState.error,
		signUp: signUpState.mutateAsync,
		signUpLoading: signUpState.isPending,
		signUpError: signUpState.error,
		createProfile: createProfileState.mutateAsync,
		createProfileLoading: createProfileState.isPending,
		createProfileError: createProfileState.error,
		signOut: signOutState.mutateAsync,
		signOutLoading: signOutState.isPending,
		signOutError: signOutState.error,
		signInWithOAuth,
	};
};
