import { describe, expect, it } from 'vitest';
import { availableYears, climateForYear } from '../climate';
import { queryHistory } from '../history';
import { detectGaps } from '../status';
import { hoursAgo, insert, memoryDb } from './helpers';

describe('queryHistory', () => {
	it('aggregates into buckets', () => {
		const db = memoryDb();
		insert(db, [
			{ timestamp: '2026-04-01 10:01:00', temperature: 10 },
			{ timestamp: '2026-04-01 10:14:00', temperature: 12 },
			{ timestamp: '2026-04-01 10:16:00.500000', temperature: 20 },
			{ timestamp: '2026-04-01 11:00:00', temperature: 30 }
		]);
		const r = queryHistory(db, {
			metric: 'temperature',
			bucket: '15m',
			from: '2026-04-01',
			to: '2026-04-01 11:00:00'
		});
		expect(r.count).toBe(2);
		expect(r.points).toEqual([
			{ t: '2026-04-01 10:00', avg: 11, min: 10, max: 12 },
			{ t: '2026-04-01 10:15', avg: 20, min: 20, max: 20 }
		]);
	});

	it('limits the default lookback by bucket', () => {
		const db = memoryDb();
		const now = new Date(2026, 3, 10, 12, 0, 0);
		const r = queryHistory(db, { metric: 'humidity', bucket: '1m' }, now);
		expect(r.from).toBe('2026-04-09 12:00:00');
		expect(r.to).toBeNull();
	});
});

describe('climateForYear', () => {
	it('aggregates months and flags completeness', () => {
		const db = memoryDb();
		const rows = [];
		for (let d = 1; d <= 31; d++) {
			const day = String(d).padStart(2, '0');
			rows.push({
				timestamp: `2025-01-${day} 12:00:00`,
				temperature: d % 2 ? -2 : 2,
				rainmonth: d
			});
		}
		rows.push({ timestamp: '2025-02-03 12:00:00', temperature: 4, rainmonth: 7 });
		insert(db, rows);

		const c = climateForYear(db, 2025, new Date(2026, 5, 1));
		expect(c.months[0]).toMatchObject({
			month: 1,
			status: 'complete',
			days_with_data: 31,
			temp_min: -2,
			temp_max: 2,
			precipitation: 31
		});
		expect(c.months[1]).toMatchObject({
			status: 'incomplete',
			days_with_data: 1,
			days_in_month: 28
		});
		expect(c.months[2]!.status).toBe('missing');
		expect(c.annual_precipitation).toBe(38);
		expect(c.annual_temp_min).toBe(-2);
		expect(c.issues).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
		expect(c.years_available).toEqual([2025]);

		const cur = climateForYear(db, 2026, new Date(2026, 5, 15));
		expect(cur.months[5]!.status).toBe('partial');
		expect(cur.months[6]!.status).toBe('future');
		expect(availableYears(db)).toEqual([2025]);
	});
});

describe('detectGaps', () => {
	it('reports receive gaps newest first', () => {
		const db = memoryDb();
		insert(db, [
			{ timestamp: hoursAgo(10) },
			{ timestamp: hoursAgo(9.99) },
			{ timestamp: hoursAgo(7) }, // Lücke ~3 h
			{ timestamp: hoursAgo(6.99) },
			{ timestamp: hoursAgo(6.5) }, // Lücke ~30 min
			{ timestamp: hoursAgo(6.49) }
		]);
		const gaps = detectGaps(db, 1);
		expect(gaps).toHaveLength(2);
		expect(gaps[0]!.duration_fmt).toBe('29 min');
		expect(gaps[1]!.duration_fmt).toBe('2 h 59 min');
	});
});
