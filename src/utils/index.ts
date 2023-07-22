import { jsonParse } from 'taketkt/lib';

export function detectChange<T extends object>(oldArr: T[], newArr: T[]): boolean {
	if (oldArr.length !== newArr.length) {
		return true;
	}
	for (let i = 0; i < newArr.length; i++) {
		const keys = Object.keys(newArr[i]);
		for (let j = 0; j < keys.length; j++) {
			if (newArr[i][keys[j]] !== oldArr[i]?.[keys[j]]) {
				return true;
			}
		}
	}
	return false;
}

export function parseJson<T>(data: any, initState?: T): T {
	try {
		const result = jsonParse<T>(data);
		return result ?? initState;
	} catch (error) {
		return null;
	}
}
