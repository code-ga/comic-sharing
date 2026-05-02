type NonNullish<T> = {
	[K in keyof T as T[K] extends null | undefined ? never : K]: Exclude<
		T[K],
		null | undefined
	>;
};

export const cleanObject = <T extends Record<string, unknown>>(
	obj: T,
): Partial<NonNullish<T>> => {
	const result: Partial<NonNullish<T>> = {};

	for (const [key, value] of Object.entries(obj)) {
		if (value !== null && value !== undefined) {
			(result as Record<string, unknown>)[key] = value;
		}
	}

	return result;
};
