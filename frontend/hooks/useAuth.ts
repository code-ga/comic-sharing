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

	const profileQuery = useQuery({
		queryKey: ["profile"],
		queryFn: async () => {
			const { data, error } = await api.api.profile.me.get();
			if (error) {
				if (error.status === 404) return null;
				throw new Error(getEdenErrorMessage(error));
			}
			return data.data;
		},
		enabled: !!sessionQuery.data?.user,
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
			queryClient.invalidateQueries({ queryKey: ["profile"] });
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
			queryClient.invalidateQueries({ queryKey: ["profile"] });
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
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["profile"] });
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
			queryClient.removeQueries({ queryKey: ["profile"] });
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
		profile: profileQuery.data,
		profileLoading: profileQuery.isLoading,
		profileError: profileQuery.error,
		hasProfile: !!profileQuery.data,
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

