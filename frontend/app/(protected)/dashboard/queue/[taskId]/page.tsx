"use client";

import { useQuery } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function TaskDetailPage({
	params: paramsPromise,
}: {
	params: Promise<{ taskId: string }>;
}) {
	const params = use(paramsPromise);
	const taskId = Number(params.taskId);
	const router = useRouter();

	const { data: taskData, isLoading, error } = useQuery({
		queryKey: ["task", taskId],
		queryFn: async () => {
			const { data, error } = await api.api.queue({ id: taskId }).get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
		refetchInterval: (query) => {
			const status = (query.state.data as any)?.data?.status;
			return status === "completed" || status === "failed" ? false : 3000;
		},
	});

	if (isLoading) {
		return (
			<div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[300px]">
				<div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
				<div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl">
					{error instanceof Error ? error.message : "Failed to load task"}
				</div>
				<button
					onClick={() => router.back()}
					className="mt-4 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm font-medium"
				>
					&larr; Back to Queue
				</button>
			</div>
		);
	}

	const task = (taskData?.data as any) || null;
	if (!task) return null;

	const statusColor =
		task.status === "completed"
			? "text-green-500 bg-green-500/10 border-green-500/20"
			: task.status === "failed"
			? "text-red-500 bg-red-500/10 border-red-500/20"
			: task.status === "claimed"
			? "text-blue-500 bg-blue-500/10 border-blue-500/20"
			: "text-orange-500 bg-orange-500/10 border-orange-500/20";

	return (
		<div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
			<div className="flex items-center gap-4">
				<button
					onClick={() => router.back()}
					className="p-2 hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
				>
					<svg
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
				</button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
						Task Details #{task.id}
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						{task.taskType === "chapter" 
							? `Chapter: ${task.targetInfo?.title || "Unknown"}`
							: `Page Number: ${(task.targetInfo?.pageNumber ?? -1) + 1}`}
					</p>
				</div>
				<div className="ml-auto flex items-center gap-3">
					<span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
						{task.status}
					</span>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Status Timeline */}
				<div className="md:col-span-1 space-y-4">
					<div className="glass rounded-xl border border-border/50 p-5">
						<h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
							Process Status
						</h3>
						
						<div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
							
							{/* OCR Step */}
							<div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
								<div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 bg-background z-10 ${
									task.stepStatus?.ocr ? "border-green-500 text-green-500" : "border-muted-foreground text-transparent"
								}`}>
									{task.stepStatus?.ocr && (
										<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
										</svg>
									)}
								</div>
								<div className="w-[calc(100%-2rem)] p-3 rounded-lg border border-border/50 bg-muted/20 ml-4">
									<h4 className="text-sm font-medium">OCR Reading</h4>
									<p className="text-xs text-muted-foreground mt-1">Extract text from image</p>
								</div>
							</div>

							{/* Metadata Extraction Step */}
							<div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
								<div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 bg-background z-10 ${
									task.stepStatus?.metadataExtraction ? "border-green-500 text-green-500" : "border-muted-foreground text-transparent"
								}`}>
									{task.stepStatus?.metadataExtraction && (
										<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
										</svg>
									)}
								</div>
								<div className="w-[calc(100%-2rem)] p-3 rounded-lg border border-border/50 bg-muted/20 ml-4">
									<h4 className="text-sm font-medium">Metadata Extraction</h4>
									<p className="text-xs text-muted-foreground mt-1">Identify characters & events</p>
								</div>
							</div>

							{/* Chapter Summary Step */}
							{task.taskType === "chapter" && (
								<div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
									<div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 bg-background z-10 ${
										task.stepStatus?.chapterSummary ? "border-green-500 text-green-500" : "border-muted-foreground text-transparent"
									}`}>
										{task.stepStatus?.chapterSummary && (
											<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
												<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
											</svg>
										)}
									</div>
									<div className="w-[calc(100%-2rem)] p-3 rounded-lg border border-border/50 bg-muted/20 ml-4">
										<h4 className="text-sm font-medium">Chapter Summary</h4>
										<p className="text-xs text-muted-foreground mt-1">Compile chapter narrative</p>
									</div>
								</div>
							)}

						</div>
					</div>

					<div className="glass rounded-xl border border-border/50 p-5 text-sm text-muted-foreground">
						<p>Created: {new Date(task.createdAt).toLocaleString()}</p>
						<p className="mt-1">Updated: {new Date(task.updatedAt).toLocaleString()}</p>
					</div>
				</div>

				{/* Payload & Results */}
				<div className="md:col-span-2 space-y-6">
					{task.errorLog && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl">
							<h3 className="font-semibold text-sm mb-2 uppercase tracking-wider">Error Log</h3>
							<pre className="text-xs overflow-x-auto whitespace-pre-wrap">{task.errorLog}</pre>
						</div>
					)}

					<div className="glass rounded-xl border border-border/50 overflow-hidden flex flex-col h-full min-h-[400px]">
						<div className="p-4 border-b border-border/50 bg-muted/20">
							<h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
								Step Result Payload
							</h3>
						</div>
						<div className="p-4 bg-[#0d1117] flex-1 overflow-x-auto">
							<pre className="text-xs text-[#c9d1d9] font-mono leading-relaxed">
								{JSON.stringify(task.stepResult || {}, null, 2)}
							</pre>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
