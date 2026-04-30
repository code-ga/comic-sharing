export const cleanObject = <T extends Record<string, any>>(obj: T) => {
	const newObj = { ...obj };
	for (const key in newObj) {
		if (newObj[key] === null || newObj[key] === undefined || newObj[key] === "") {
			delete newObj[key];
		}
	}
	return newObj as T;
};