import { sql } from 'drizzle-orm';
import { formatDuration, formatShort, toDbTimestamp } from '$lib/format';
import type { Db } from './db/client';
import { STALE_THRESHOLD_SECONDS } from './weather';

export const STATUS_RANGES = {
	'7d': { days: 7, label: '7 Tage' },
	'30d': { days: 30, label: '30 Tage' },
	'90d': { days: 90, label: '90 Tage' },
	'365d': { days: 365, label: 'Jahr' }
} as const;
export type StatusRange = keyof typeof STATUS_RANGES;

export const MAX_GAPS = 500;

export type Gap = { start_fmt: string; end_fmt: string; duration_fmt: string; seconds: number };

/**
 * Lücken im Datenempfang der letzten `days` Tage (Abstand aufeinanderfolgender
 * Messwerte > threshold). Neueste zuerst, maximal MAX_GAPS.
 */
export function detectGaps(
	db: Db,
	days: number,
	threshold = STALE_THRESHOLD_SECONDS,
	now = new Date()
): Gap[] {
	const since = toDbTimestamp(new Date(now.getTime() - days * 86_400_000));
	const rows = db.all<{ gap_start: string; gap_end: string; gap_seconds: number }>(sql`
		WITH windowed AS (
			SELECT timestamp AS ts, LAG(timestamp) OVER (ORDER BY timestamp) AS prev_ts
			FROM wetterdaten
			WHERE timestamp >= ${since}
		)
		SELECT prev_ts AS gap_start, ts AS gap_end,
		       CAST(ROUND((julianday(ts) - julianday(prev_ts)) * 86400) AS INTEGER) AS gap_seconds
		FROM windowed
		WHERE prev_ts IS NOT NULL
		  AND (julianday(ts) - julianday(prev_ts)) * 86400 > ${threshold}
		ORDER BY ts DESC
		LIMIT ${MAX_GAPS}`);
	return rows.map((r) => ({
		start_fmt: formatShort(r.gap_start),
		end_fmt: formatShort(r.gap_end),
		duration_fmt: formatDuration(r.gap_seconds),
		seconds: r.gap_seconds
	}));
}
