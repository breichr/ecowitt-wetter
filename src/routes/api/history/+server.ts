import { error, json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client';
import { BUCKETS, isBucket, isMetric, queryHistory } from '$lib/server/history';
import type { RequestHandler } from './$types';

/** Aggregierter Verlauf, z. B. /api/history?metric=temperature&from=2026-04-01&bucket=1h */
export const GET: RequestHandler = ({ url }) => {
	const metric = url.searchParams.get('metric');
	const bucket = url.searchParams.get('bucket') ?? '1h';
	if (!metric) error(422, 'metric is required');
	if (!isMetric(metric)) error(400, `unknown metric: ${metric}`);
	if (!isBucket(bucket)) error(400, `unknown bucket: ${bucket} (allowed: ${BUCKETS.join(', ')})`);
	return json(
		queryHistory(getDb(), {
			metric,
			bucket,
			from: url.searchParams.get('from'),
			to: url.searchParams.get('to')
		})
	);
};
