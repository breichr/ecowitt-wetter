import { config } from '$lib/server/config';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({
	stationName: config.stationName,
	stationElevation: config.stationElevation
});
