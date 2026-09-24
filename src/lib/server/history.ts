import { sql } from 'drizzle-orm';
import { toDbTimestamp } from '$lib/format';
import type { Db } from './db/client';

export const ALLOWED_METRICS = [
	'temperature', 'humidity', 'pressure', 'pressureabs',
	'windspeed', 'windgust', 'maxdailygust', 'winddir',
	'solar', 'uv', 'indoortemp', 'indoorhumidity', 'vpd',
	'rainrate', 'raintoday', 'rainweek', 'rainmonth', 'rainyear'
] as const; // prettier-ignore
export type Metric = (typeof ALLOWED_METRICS)[number];

const BUCKET_EXPR = {
	'1m': `strftime('%Y-%m-%d %H:%M', timestamp)`,
	'5m': `strftime('%Y-%m-%d %H:', timestamp) || printf('%02d', (cast(strftime('%M', timestamp) as int) / 5) * 5)`,
	'15m': `strftime('%Y-%m-%d %H:', timestamp) || printf('%02d', (cast(strftime('%M', timestamp) as int) / 15) * 15)`,
	'1h': `strftime('%Y-%m-%d %H:00', timestamp)`,
	'1d': `strftime('%Y-%m-%d', timestamp)`
} as const;
export type Bucket = keyof typeof BUCKET_EXPR;
export const BUCKETS = Object.keys(BUCKET_EXPR) as Bucket[];

export const MAX_POINTS = 5000;

const DAY_MS = 86_400_000;
/** Ohne ?from= wird der Zeitraum je nach Bucket begrenzt. */
export const DEFAULT_LOOKBACK_MS: Record<Bucket, number> = {
	'1m': 1 * DAY_MS,
	'5m': 7 * DAY_MS,
	'15m': 31 * DAY_MS,
	'1h': 180 * DAY_MS,
	'1d': 1826 * DAY_MS // ~5 Jahre
};

export const isMetric = (m: string): m is Metric =>
	(ALLOWED_METRICS as readonly string[]).includes(m);
export const isBucket = (b: string): b is Bucket => b in BUCKET_EXPR;

export type HistoryPoint = {
	t: string;
	avg: number | null;
	min: number | null;
	max: number | null;
};

export function queryHistory(
	db: Db,
	opts: { metric: Metric; bucket: Bucket; from?: string | null; to?: string | null },
	now = new Date()
) {
	const from =
		opts.from || toDbTimestamp(new Date(now.getTime() - DEFAULT_LOOKBACK_MS[opts.bucket]));
	const to = opts.to || null;
	// metric und bucket sind gegen feste Listen geprüft → sql.raw ist sicher.
	const col = sql.raw(opts.metric);
	const points = db.all<HistoryPoint>(sql`
		SELECT ${sql.raw(BUCKET_EXPR[opts.bucket])} AS t,
		       ROUND(AVG(${col}), 2) AS avg,
		       ROUND(MIN(${col}), 2) AS min,
		       ROUND(MAX(${col}), 2) AS max
		FROM wetterdaten
		WHERE timestamp >= ${from} ${to ? sql`AND timestamp < ${to}` : sql``}
		GROUP BY t ORDER BY t LIMIT ${MAX_POINTS}`);
	return { metric: opts.metric, bucket: opts.bucket, from, to, count: points.length, points };
}
