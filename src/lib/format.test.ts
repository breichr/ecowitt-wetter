import { describe, expect, it } from 'vitest';
import { formatDuration, formatShort, parseDbTimestamp, round, toDbTimestamp } from './format';

describe('format', () => {
	it('round-trips DB timestamps', () => {
		const d = new Date(2026, 3, 1, 9, 5, 7);
		expect(toDbTimestamp(d)).toBe('2026-04-01 09:05:07');
		expect(parseDbTimestamp('2026-04-01 09:05:07')).toEqual(d);
	});

	it('parses legacy timestamps with microseconds and ISO "T"', () => {
		expect(parseDbTimestamp('2026-04-01 09:05:07.123456')).toEqual(new Date(2026, 3, 1, 9, 5, 7));
		expect(parseDbTimestamp('2026-04-01T09:05:07')).toEqual(new Date(2026, 3, 1, 9, 5, 7));
		expect(parseDbTimestamp('kaputt')).toBeNull();
	});

	it('formats short dates and durations like the Python version', () => {
		expect(formatShort('2026-12-24 18:30:00')).toBe('24.12. 18:30');
		expect(formatDuration(30)).toBe('1 min');
		expect(formatDuration(900)).toBe('15 min');
		expect(formatDuration(3600)).toBe('1 h');
		expect(formatDuration(3600 * 3 + 12 * 60 + 5)).toBe('3 h 12 min');
	});

	it('rounds', () => {
		expect(round(12.345, 1)).toBe(12.3);
		expect(round(-17.77, 1)).toBe(-17.8);
		expect(round(77.6)).toBe(78);
	});
});
