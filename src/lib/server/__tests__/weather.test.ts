import { describe, expect, it } from 'vitest';
import {
	batteryWarnings,
	classifyPressureTrend,
	computeMinMax,
	dataAgeSeconds,
	degToCompass,
	dewPoint,
	getLatest,
	pressureTrend,
	rainLast24h,
	refreshLatest,
	staleLabel
} from '../weather';
import { hoursAgo, insert, memoryDb } from './helpers';

describe('pure helpers', () => {
	it('maps degrees to the German 16-point compass', () => {
		expect(degToCompass(0)).toBe('N');
		expect(degToCompass(11.2)).toBe('N');
		expect(degToCompass(11.3)).toBe('NNO');
		expect(degToCompass(90)).toBe('O');
		expect(degToCompass(247)).toBe('WSW');
		expect(degToCompass(359)).toBe('N');
		expect(degToCompass(null)).toBe('');
		expect(degToCompass(NaN)).toBe('');
	});

	it('computes the dew point (Magnus)', () => {
		expect(dewPoint(20, 50)).toBe(9.3);
		expect(dewPoint(0, 100)).toBe(0);
		expect(dewPoint(20, 0)).toBeNull();
		expect(dewPoint(null, 50)).toBeNull();
	});

	it('warns about low batteries', () => {
		expect(batteryWarnings(0, 1.3)).toEqual([]);
		expect(batteryWarnings(1, 1.1)).toEqual(['Außensensor', 'Konsole (1.10 V)']);
		expect(batteryWarnings(null, 0)).toEqual([]);
	});

	it('classifies the pressure trend', () => {
		expect(classifyPressureTrend(2).label).toBe('stark steigend');
		expect(classifyPressureTrend(0.5).symbol).toBe('⬈');
		expect(classifyPressureTrend(0.49).symbol).toBe('');
		expect(classifyPressureTrend(-0.5).label).toBe('fallend');
		expect(classifyPressureTrend(-1.5).label).toBe('stark fallend');
	});

	it('labels stale data', () => {
		expect(staleLabel(null)).toBeNull();
		expect(staleLabel(600)).toBeNull();
		expect(staleLabel(601)).toBe('10 min alt');
		expect(staleLabel(7200)).toBe('2 h alt');
		expect(staleLabel(3 * 86400)).toBe('3 d alt');
	});
});

describe('database-backed values', () => {
	it('computes the 3 h pressure trend', () => {
		const db = memoryDb();
		expect(pressureTrend(db)).toBeNull();
		insert(db, [
			{ timestamp: hoursAgo(4), pressure: 1010 },
			{ timestamp: hoursAgo(0.1), pressure: 1012.1 }
		]);
		expect(pressureTrend(db)).toEqual({ delta: 2.1, symbol: '⬆', label: 'stark steigend' });
	});

	it('derives 24 h rain from the yearly counter and falls back on reset', () => {
		const db = memoryDb();
		insert(db, [
			{ timestamp: hoursAgo(25), rainyear: 100 },
			{ timestamp: hoursAgo(1), rainyear: 112.4 }
		]);
		expect(rainLast24h(db)).toBe(12.4);
		insert(db, [{ timestamp: hoursAgo(0), rainyear: 0 }]);
		expect(rainLast24h(db)).toBeNull();
	});

	it('finds min/max including legacy microsecond timestamps', () => {
		const db = memoryDb();
		const now = new Date();
		const today = (h: number) =>
			`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(h).padStart(2, '0')}:00:00`;
		insert(db, [
			{ timestamp: `${today(0)}.123456`, temperature: -3.2 },
			{ timestamp: today(0).replace('00:00:00', '00:30:00'), temperature: 5 },
			{ timestamp: today(0).replace('00:00:00', '00:45:00'), temperature: null }
		]);
		const mm = computeMinMax(db);
		expect(mm.daymintemp).toBe(-3.2);
		expect(mm.daymaxtemp).toBe(5);
		expect(mm.yearmintemp).toBe(-3.2);
		expect(mm.daymintemptime).toMatch(/^\d{2}\.\d{2}\. 00:00$/);
	});

	it('builds and caches the latest snapshot', () => {
		const db = memoryDb();
		expect(refreshLatest(db)).toBeNull();
		insert(db, [
			{
				timestamp: hoursAgo(0.5),
				temperature: 20,
				humidity: 50,
				winddir: 90,
				rainlast24hrs: 3,
				batt_sensor: 1,
				batt_console: 1.3
			}
		]);
		const s = refreshLatest(db)!;
		expect(getLatest()).toBe(s);
		expect(s.winddir).toBe('O');
		expect(s.winddir_deg).toBe(90);
		expect(s.dewpoint).toBe(9.3);
		expect(s.rainlast24hrs).toBe(3); // kein 24-h-Vergleichswert → Stationswert
		expect(s.battery_warnings).toEqual(['Außensensor']);
		const age = dataAgeSeconds(s)!;
		expect(age).toBeGreaterThanOrEqual(1799);
		expect(age).toBeLessThan(1810);
	});
});
