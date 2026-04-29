"use client";

import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
	const { session: userSession } = useAuth();

	return (
		<div className="max-w-4xl mx-auto p-6">
			<div className="bg-white rounded-lg shadow-sm border border-border p-6">
				<h1 className="text-2xl font-bold mb-4">Dashboard</h1>
				<div className="p-4 bg-muted/50 rounded-lg">
					<p className="text-sm text-muted-foreground mb-1">User Name</p>
					<p className="text-lg font-semibold">
						{userSession?.user?.name || userSession?.user?.email || "User"}
					</p>
				</div>
			</div>
		</div>
	);
}
