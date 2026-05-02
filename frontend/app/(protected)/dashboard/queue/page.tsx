"use client";

import { useQuery } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import Link from "next/link";
import { useState } from "react";

export default function QueueListingPage() {
	const [page, setPage] = useState(1);
	const limit = 10;

	const { data: queueData, isLoading, error } = useQuery({
		queryKey: ["queue", page, limit],
		queryFn: async () => {
			const { data, error } = await api.api.queue.get({ query: { page, limit } });
			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
		refetchInterval: 5000,
	});

	if (isLoading) {
		return (
			<div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[300px]">
				<div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
				<div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl">
					{error instanceof Error ? error.message : "Failed to load queue"}
				</div>
			</div>
		);
	}

	const tasks = (queueData?.data as any)?.tasks || [];
	const totalPages = (queueData?.data as any)?.totalPages || 1;

	return (
		<div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
					AI Processing Queue
				</h1>
			</div>

			<div className="glass rounded-2xl border border-border/50 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-muted/30 border-b border-border/50 text-muted-foreground uppercase text-xs font-semibold">
							<tr>
								<th className="px-6 py-4">Task ID</th>
								<th className="px-6 py-4">Type</th>
								<th className="px-6 py-4">Target</th>
								<th className="px-6 py-4">Status</th>
								<th className="px-6 py-4">Created At</th>
								<th className="px-6 py-4 text-right">Action</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border/50">
							{tasks.map((task: any) => (
								<tr key={task.id} className="hover:bg-muted/20 transition-colors">
									<td className="px-6 py-4 font-medium text-foreground">
										#{task.id}
									</td>
									<td className="px-6 py-4">
										<span className="capitalize">{task.taskType}</span>
									</td>
									<td className="px-6 py-4 text-muted-foreground">
										{task.taskType === "chapter" 
											? `Chapter: ${task.targetInfo?.title || "Unknown"}`
											: `Page Number: ${(task.targetInfo?.pageNumber ?? -1) + 1}`}
									</td>
									<td className="px-6 py-4">
										<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
											task.status === "completed" ? "bg-green-500/10 text-green-500 border-green-500/20" :
											task.status === "failed" ? "bg-red-500/10 text-red-500 border-red-500/20" :
											task.status === "claimed" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
											"bg-orange-500/10 text-orange-500 border-orange-500/20"
										}`}>
											{task.status}
										</span>
									</td>
									<td className="px-6 py-4 text-muted-foreground">
										{new Date(task.createdAt).toLocaleString()}
									</td>
									<td className="px-6 py-4 text-right">
										<Link
											href={`/dashboard/queue/${task.id}`}
											className="text-primary hover:text-accent font-medium transition-colors"
										>
											View Details
										</Link>
									</td>
								</tr>
							))}
							{tasks.length === 0 && (
								<tr>
									<td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
										No tasks found in the queue.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				
				{/* Pagination */}
				{totalPages > 1 && (
					<div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/10">
						<button
							onClick={() => setPage(p => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
						>
							Previous
						</button>
						<span className="text-sm text-muted-foreground">
							Page {page} of {totalPages}
						</span>
						<button
							onClick={() => setPage(p => Math.min(totalPages, p + 1))}
							disabled={page === totalPages}
							className="px-4 py-2 text-sm font-medium hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
						>
							Next
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
