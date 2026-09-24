import { availableYears, climateForYear } from '$lib/server/climate';
import { getDb } from '$lib/server/db/client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const db = getDb();
	const years = availableYears(db);
	const requested = Number(url.searchParams.get('year'));
	const year = years.includes(requested) ? requested : (years.at(-1) ?? null);
	return { years, year, climate: year !== null ? climateForYear(db, year) : null };
};
