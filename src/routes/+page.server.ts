import { dataAgeSeconds, getLatest, staleLabel } from '$lib/server/weather';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ depends }) => {
	depends('app:latest');
	const latest = getLatest();
	return { latest, stale: staleLabel(dataAgeSeconds(latest)) };
};
