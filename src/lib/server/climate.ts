import { sql } from 'drizzle-orm';
import type { Db } from './db/client';

import type { Climate, ClimateMonth, MonthStatus } from '$lib/types';

export type { Climate, ClimateMonth, MonthStatus };

export function availableYears(db: Db): number[] {
	return db
		.all<{ y: number | null }>(
			sql`SELECT DISTINCT CAST(strftime('%Y', timestamp) AS INTEGER) AS y FROM wetterdaten ORDER BY y`
		)
		.map((r) => r.y)
		.filter((y): y is number => y !== null);
}

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

/**
 * Monatsaggregation eines Kalenderjahres für ein Klimadiagramm.
 * Niederschlag = MAX(rainmonth) (Stationszähler setzt am Monatsanfang zurück).
 */
export function climateForYear(db: Db, year: number, today = new Date()): Climate {
	type Row = Omit<ClimateMonth, 'status' | 'days_in_month'>;
	const rows = db.all<Row>(sql`
		SELECT CAST(strftime('%m', timestamp) AS INTEGER) AS month,
		       ROUND(AVG(temperature), 1) AS temp_avg,
		       ROUND(MIN(temperature), 1) AS temp_min,
		       ROUND(MAX(temperature), 1) AS temp_max,
		       ROUND(MAX(rainmonth), 1) AS precipitation,
		       COUNT(DISTINCT date(timestamp)) AS days_with_data
		FROM wetterdaten
		WHERE timestamp >= ${`${year}-01-01`} AND timestamp < ${`${year + 1}-01-01`}
		GROUP BY month ORDER BY month`);
	const byMonth = new Map(rows.map((r) => [r.month, r]));

	const curYear = today.getFullYear();
	const curMonth = today.getMonth() + 1;
	const months: ClimateMonth[] = [];
	for (let m = 1; m <= 12; m++) {
		const dim = daysInMonth(year, m);
		let status: MonthStatus;
		let data: Row | undefined;
		if (year > curYear || (year === curYear && m > curMonth)) {
			status = 'future';
		} else if (year === curYear && m === curMonth) {
			data = byMonth.get(m);
			status = 'partial';
		} else {
			data = byMonth.get(m);
			if (!data) status = 'missing';
			else if (data.days_with_data >= dim * 0.9) status = 'complete';
			else status = 'incomplete';
		}
		months.push({
			month: m,
			status,
			days_in_month: dim,
			days_with_data: data?.days_with_data ?? 0,
			temp_avg: data?.temp_avg ?? null,
			temp_min: data?.temp_min ?? null,
			temp_max: data?.temp_max ?? null,
			precipitation: data?.precipitation ?? null
		});
	}

	const nonNull = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null);
	const temps = nonNull(months.map((m) => m.temp_avg));
	const mins = nonNull(months.map((m) => m.temp_min));
	const maxs = nonNull(months.map((m) => m.temp_max));
	const totalPrecip = months.reduce((s, m) => s + (m.precipitation ?? 0), 0);

	return {
		year,
		months,
		annual_temp_avg: temps.length
			? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
			: null,
		annual_temp_min: mins.length ? Math.min(...mins) : null,
		annual_temp_max: maxs.length ? Math.max(...maxs) : null,
		annual_precipitation: Math.round(totalPrecip * 10) / 10,
		issues: months
			.filter((m) => m.status === 'incomplete' || m.status === 'missing' || m.status === 'partial')
			.map((m) => m.month),
		years_available: availableYears(db)
	};
}
