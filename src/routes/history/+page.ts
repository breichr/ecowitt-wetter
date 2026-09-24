import { HISTORY_RANGES, type HistoryRange } from '$lib/ranges';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const r = url.searchParams.get('range') ?? '24h';
	const period: HistoryRange = r in HISTORY_RANGES ? (r as HistoryRange) : '24h';
	return { period };
};
