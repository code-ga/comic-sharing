const currentPages = [
	{ pageIndex: 0 },
	{ pageIndex: 1 },
	{ pageIndex: 2, title: "hello" },
];
const startPostion = 2;
const newItems = [{ pageIndex: 9 }, { pageIndex: 10 }, { pageIndex: 11 }];

function uhh<T extends { pageIndex: number }>(
	currentPages: T[],
	startPostion: number,
	newItems: T[],
) {
	if (startPostion >= currentPages.length) {
		const result = [...currentPages];
		let i = currentPages.length;
		for (const newItem of newItems) {
			result.push({ ...newItem, pageIndex: i });
			i++;
		}
		return result;
	} else {
		const arrayBefore = currentPages.slice(0, startPostion);
		const arrayAfter = currentPages.slice(startPostion);
		const result = [...arrayBefore];
		let i = result.length;
		for (const newItem of newItems) {
			result.push({ ...newItem, pageIndex: i });
			i++;
		}
		for (const item of arrayAfter) {
			result.push({ ...item, pageIndex: i });
			i++;
		}
		return result;
	}
}
console.log(uhh(currentPages, startPostion, newItems));
