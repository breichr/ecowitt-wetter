import { formatDuration } from '$lib/format';
import { getDb } from '$lib/server/db/client';
import { detectGaps, STATUS_RANGES, type StatusRange } from '$lib/server/status';
import { dataAgeSeconds, getLatest, STALE_THRESHOLD_SECONDS } from '$lib/server/weather';
import type { PageServerLoad } from './$types';

// Nicht in der Navigation verlinkt, nur über direkte URL erreichbar.
export const load: PageServerLoad = ({ url }) => {
	const r = url.searchParams.get('range') ?? '30d';
	const period: StatusRange = r in STATUS_RANGES ? (r as StatusRange) : '30d';
	const gaps = detectGaps(getDb(), STATUS_RANGES[period].days);
	const age = dataAgeSeconds(getLatest());
	return {
		period,
		ranges: Object.entries(STATUS_RANGES).map(([key, v]) => ({ key, label: v.label })),
		periodLabel: STATUS_RANGES[period].label,
		gaps,
		totalDowntime: gaps.length ? formatDuration(gaps.reduce((s, g) => s + g.seconds, 0)) : null,
		online: age !== null && age <= STALE_THRESHOLD_SECONDS,
		age
	};
};
