/** @jsxImportSource react */
"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getEdenErrorMessage } from "@/lib/api";
import InputField from "@/components/auth/InputField";
import Image from "next/image";
import { BACKEND_URL } from "../../../../../../../constants";

interface ChapterPage {
	id: number;
	pageNumber: number;
	imageUrl: string;
	content: string;
	authorId: string;
	chapterId: number;
}

interface EditChapterPageProps {
	params: Promise<{
		comicId: string;
		chapterId: string;
	}>;
}

export default function EditChapterPage({
	params: paramsPromise,
}: EditChapterPageProps) {
	const params = use(paramsPromise);
	const comicId = params.comicId;
	const chapterId = params.chapterId;
	const router = useRouter();
	const queryClient = useQueryClient();

	const [title, setTitle] = useState("");
	const [indexing, setIndexing] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [pageContent, setPageContent] = useState("");
	const [startPosition, setStartPosition] = useState("0");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isUploadExpanded, setIsUploadExpanded] = useState(false);
	const [queuedPages, setQueuedPages] = useState<Set<number>>(new Set());

	const { data: chapterData, isLoading: isChapterLoading } = useQuery({
		queryKey: ["chapter", chapterId],
		queryFn: async () => {
			const { data, error } = await api.api
				.chapters({ id: Number(chapterId) })
				.get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
	});

	const { data: chapterPagesData = { data: [] } } = useQuery({
		queryKey: ["chapterPages", chapterId],
		queryFn: async () => {
			const { data, error } = await api.api["chapter-images"]
				.chapter({ "chapter-id": chapterId })
				.get();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
	});

	useEffect(() => {
		if (chapterData?.data) {
			const chapter = chapterData.data;
			setTitle(chapter.title);
			setIndexing(chapter.index.toString());
		}
	}, [chapterData]);

	const updateMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.api
				.chapters({ id: Number(chapterId) })
				.put({
					title,
					indexing: indexing ? Number(indexing) : undefined,
				});

			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
		onSuccess: () => {
			setError(null);
			router.push("/dashboard");
			router.refresh();
		},
		onError: (err: any) => {
			setError(err.message);
		},
	});

	const uploadPagesMutation = useMutation({
		mutationFn: async () => {
			if (selectedFiles.length === 0) {
				throw new Error("Please select at least one image");
			}

			const formData = new FormData();
			formData.append("chapterId", chapterId);
			formData.append("content", pageContent);
			formData.append("startPostion", startPosition);
			selectedFiles.forEach((file) => {
				console.log(file);
				formData.append("images", file);
			});

			const response = await fetch(`${BACKEND_URL}/api/chapter-images/add`, {
				method: "POST",
				body: formData,
				credentials: "include",
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to upload chapter pages");
			}

			return response.json();
		},
		onSuccess: () => {
			setSelectedFiles([]);
			setPageContent("");
			setStartPosition("0");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			setIsUploadExpanded(false);
			queryClient.invalidateQueries({ queryKey: ["chapterPages", chapterId] });
		},
		onError: (err: any) => {
			setError(err.message);
		},
	});

	const deletePageMutation = useMutation({
		mutationFn: async (pageId: number) => {
			const { data, error } = await api.api["chapter-images"]({
				id: pageId,
			}).delete();
			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["chapterPages", chapterId] });
		},
		onError: (err: any) => {
			setError(err.message);
		},
	});

	const addToQueueMutation = useMutation({
		mutationFn: async ({
			pageId,
			inpaintImage,
		}: {
			pageId: number;
			inpaintImage: boolean;
		}) => {
			const { data, error } = await api.api["chapter-images"]
				["add-queue"]({
					id: pageId,
				})
				.post({
					inpaintImage,
				});
			if (error) throw new Error(getEdenErrorMessage(error));
			return data;
		},
		onSuccess: (_, { pageId }) => {
			setError(null);
			setQueuedPages((prev) => new Set(prev).add(pageId));
		},
		onError: (err: any) => {
			setError(err.message);
		},
	});

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			setSelectedFiles(Array.from(e.target.files));
		}
	};

	const handleUploadPages = (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedFiles.length === 0) {
			setError("Please select at least one image");
			return;
		}
		setError(null);
		uploadPagesMutation.mutate();
	};

	const handleSubmitChapterInfo = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!title) {
			setError("Chapter title is required");
			return;
		}
		updateMutation.mutate();
	};

	const handleAddToQueue = (pageId: number, inpaintImage: boolean = false) => {
		addToQueueMutation.mutate({ pageId, inpaintImage });
	};

	const chapterPages = chapterPagesData?.data || [];

	if (isChapterLoading) {
		return (
			<div className="max-w-xl mx-auto p-6 flex items-center justify-center min-h-[300px]">
				<div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
			{error && (
				<div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Chapter Info Section */}
				<div className="lg:col-span-1">
					<div className="glass rounded-2xl border border-border/50 overflow-hidden sticky top-6">
						<div className="p-6 border-b border-border/50 bg-muted/20">
							<h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
								Chapter Info
							</h2>
						</div>

						<form onSubmit={handleSubmitChapterInfo} className="p-6 space-y-6">
							<InputField
								label="Chapter Title"
								placeholder="e.g. Chapter 1: The Beginning"
								value={title}
								onChange={setTitle}
								required
								disabled={updateMutation.isPending}
							/>

							<InputField
								label="Index"
								type="number"
								placeholder="Order position"
								value={indexing}
								onChange={setIndexing}
								disabled={updateMutation.isPending}
							/>

							<div className="pt-4 flex flex-col gap-3">
								<button
									type="submit"
									className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
									disabled={updateMutation.isPending}
								>
									{updateMutation.isPending ? (
										<span className="flex items-center justify-center gap-2">
											<svg
												className="w-4 h-4 animate-spin"
												fill="none"
												viewBox="0 0 24 24"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												></circle>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
											Updating...
										</span>
									) : (
										"Update Chapter"
									)}
								</button>
								<button
									type="button"
									onClick={() => router.back()}
									className="px-6 py-2.5 text-sm font-medium hover:bg-muted/50 rounded-xl transition-all duration-200"
									disabled={updateMutation.isPending}
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>

				{/* Chapter Pages Section */}
				<div className="lg:col-span-2 space-y-6">
					{/* Upload Pages Section */}
					<div className="glass rounded-2xl border border-border/50 overflow-hidden">
						<button
							type="button"
							onClick={() => setIsUploadExpanded(!isUploadExpanded)}
							className="w-full p-6 flex items-center justify-between border-b border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors"
						>
							<h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
								Upload Chapter Pages
							</h2>
							<svg
								className={`w-6 h-6 transition-transform ${
									isUploadExpanded ? "rotate-180" : ""
								}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 14l-7 7m0 0l-7-7m7 7V3"
								/>
							</svg>
						</button>

						{isUploadExpanded && (
							<form onSubmit={handleUploadPages} className="p-6 space-y-6">
								<div className="space-y-2">
									<label className="block text-sm font-medium">
										Select Images
									</label>
									<div
										className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
										onClick={() => fileInputRef.current?.click()}
									>
										<svg
											className="w-12 h-12 mx-auto mb-3 text-muted-foreground"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 4v16m8-8H4"
											/>
										</svg>
										<p className="text-muted-foreground">
											{selectedFiles.length > 0
												? `${selectedFiles.length} files selected`
												: "Click to select images or drag and drop"}
										</p>
										<p className="text-xs text-muted-foreground/50 mt-1">
											JPG, PNG supported
										</p>
									</div>
									<input
										ref={fileInputRef}
										type="file"
										multiple
										accept="image/*"
										onChange={handleFileSelect}
										className="hidden"
									/>
								</div>

								<InputField
									label="Start Position"
									type="number"
									placeholder="Position to insert pages (0 = beginning)"
									value={startPosition}
									onChange={setStartPosition}
									disabled={uploadPagesMutation.isPending}
								/>

								<div className="space-y-2">
									<label className="block text-sm font-medium">
										Page Content (optional)
									</label>
									<textarea
										placeholder="Description or notes for these pages..."
										value={pageContent}
										onChange={(e) => setPageContent(e.target.value)}
										disabled={uploadPagesMutation.isPending}
										className="w-full px-4 py-2.5 bg-background border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
										rows={3}
									/>
								</div>

								{selectedFiles.length > 0 && (
									<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
										{selectedFiles.map((file, idx) => (
											<div key={idx} className="relative group">
												<div className="aspect-square bg-muted rounded-lg overflow-hidden">
													<Image
														src={URL.createObjectURL(file)}
														alt={`Preview ${idx + 1}`}
														fill
														className="object-cover"
													/>
												</div>
												<p className="text-xs text-muted-foreground text-center mt-1 truncate">
													{idx + 1}
												</p>
											</div>
										))}
									</div>
								)}

								<div className="pt-4 flex gap-3">
									<button
										type="submit"
										className="flex-1 px-6 py-2.5 bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
										disabled={
											uploadPagesMutation.isPending ||
											selectedFiles.length === 0
										}
									>
										{uploadPagesMutation.isPending ? (
											<span className="flex items-center justify-center gap-2">
												<svg
													className="w-4 h-4 animate-spin"
													fill="none"
													viewBox="0 0 24 24"
												>
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="4"
													></circle>
													<path
														className="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
												Uploading...
											</span>
										) : (
											"Upload Pages"
										)}
									</button>
									<button
										type="button"
										onClick={() => {
											setSelectedFiles([]);
											if (fileInputRef.current) {
												fileInputRef.current.value = "";
											}
										}}
										className="px-6 py-2.5 text-sm font-medium hover:bg-muted/50 rounded-xl transition-all duration-200"
										disabled={uploadPagesMutation.isPending}
									>
										Clear
									</button>
								</div>
							</form>
						)}
					</div>

					{/* Chapter Pages List */}
					<div className="glass rounded-2xl border border-border/50 overflow-hidden">
						<div className="p-6 border-b border-border/50 bg-muted/20">
							<h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
								Chapter Pages ({chapterPages.length})
							</h2>
						</div>

						{chapterPages.length === 0 ? (
							<div className="p-12 text-center text-muted-foreground">
								<p>No pages uploaded yet. Upload pages to get started.</p>
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
								{chapterPages
									.sort((a, b) => a.pageNumber - b.pageNumber)
									.map((page) => (
										<div
											key={page.id}
											className="group relative rounded-xl overflow-hidden bg-muted border border-border/50 hover:border-primary/50 transition-all"
										>
											<div className="aspect-square relative">
												<img
													src={page.imageUrl}
													alt={`Page ${page.pageNumber + 1}`}
													className="object-cover group-hover:scale-105 transition-transform duration-300"
												/>
											</div>
											<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
												<p className="text-white text-sm font-medium mb-3">
													Page {page.pageNumber + 1}
												</p>
												<div className="flex gap-2">
													<button
														type="button"
														onClick={() => handleAddToQueue(page.id)}
														disabled={
															addToQueueMutation.isPending ||
															queuedPages.has(page.id)
														}
														className="flex-1 px-3 py-2 bg-primary/80 hover:bg-primary text-primary-foreground text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
													>
														{queuedPages.has(page.id) ? (
															"Queued"
														) : addToQueueMutation.isPending ? (
															<span className="flex items-center justify-center gap-1">
																<svg
																	className="w-3 h-3 animate-spin"
																	fill="none"
																	viewBox="0 0 24 24"
																>
																	<circle
																		className="opacity-25"
																		cx="12"
																		cy="12"
																		r="10"
																		stroke="currentColor"
																		strokeWidth="4"
																	></circle>
																	<path
																		className="opacity-75"
																		fill="currentColor"
																		d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
																	></path>
																</svg>
																Adding...
															</span>
														) : (
															"AI Process"
														)}
													</button>
													<button
														type="button"
														onClick={() => deletePageMutation.mutate(page.id)}
														disabled={deletePageMutation.isPending}
														className="px-3 py-2 bg-destructive/80 hover:bg-destructive text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
													>
														{deletePageMutation.isPending ? (
															<span className="flex items-center justify-center">
																<svg
																	className="w-3 h-3 animate-spin"
																	fill="none"
																	viewBox="0 0 24 24"
																>
																	<circle
																		className="opacity-25"
																		cx="12"
																		cy="12"
																		r="10"
																		stroke="currentColor"
																		strokeWidth="4"
																	></circle>
																	<path
																		className="opacity-75"
																		fill="currentColor"
																		d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
																	></path>
																</svg>
															</span>
														) : (
															"Delete"
														)}
													</button>
												</div>
											</div>
										</div>
									))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
