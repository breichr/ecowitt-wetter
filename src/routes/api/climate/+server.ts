import { error, json } from '@sveltejs/kit';
import { climateForYear } from '$lib/server/climate';
import { getDb } from '$lib/server/db/client';
import type { RequestHandler } from './$types';

/** Monatliche Klima-Aggregation eines Kalenderjahres. */
export const GET: RequestHandler = ({ url }) => {
	const year = Number(url.searchParams.get('year'));
	if (!Number.isInteger(year) || year < 2000 || year > 2100) {
		error(422, 'year must be an integer between 2000 and 2100');
	}
	return json(climateForYear(getDb(), year));
};
