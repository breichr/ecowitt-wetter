import { describe, expect, it } from 'vitest';
import { logSafe, parseEcowittPayload } from '../ecowitt';
import { formOf, SAMPLE_PAYLOAD } from './helpers';

describe('parseEcowittPayload', () => {
	const now = new Date(2026, 3, 1, 12, 0, 0);

	it('converts imperial units to metric', () => {
		const r = parseEcowittPayload(formOf(SAMPLE_PAYLOAD), now);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.record).toMatchObject({
			timestamp: '2026-04-01 12:00:00',
			model: 'WS2900_V2.02.03',
			temperature: 12,
			humidity: 78,
			pressure: 1016.3,
			pressureabs: 940.3,
			windspeed: 7.2,
			windgust: 13,
			maxdailygust: 20.2,
			winddir: 247,
			solar: 312.5,
			uv: 2,
			indoortemp: 22,
			indoorhumidity: 45,
			vpd: 0.225,
			rainrate: 0.3,
			rainlast24hrs: 2.8,
			raintoday: 1.8,
			rainweek: 8.6,
			rainmonth: 26,
			rainyear: 236.3,
			batt_sensor: 0,
			batt_console: 1.3
		});
	});

	it('drops the outdoor-sensor-offline sentinel (humidity=0)', () => {
		const r = parseEcowittPayload(formOf({ ...SAMPLE_PAYLOAD, humidity: '0', tempf: '-0' }), now);
		expect(r).toEqual({ ok: false, reason: 'outdoor sensor offline' });
	});

	it('treats missing or non-finite numbers as defaults', () => {
		const r = parseEcowittPayload(
			formOf({ humidity: '50', tempf: 'NaN', windspeedmph: 'Infinity' }),
			now
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.record.temperature).toBe(-17.8);
		expect(r.record.windspeed).toBe(0);
		expect(r.record.batt_console).toBeNull();
		expect(r.record.model).toBeNull();
	});

	it('strips control characters for logging', () => {
		expect(logSafe('a\nb\x1b[31mc')).toBe('ab[31mc');
		expect(logSafe('x'.repeat(200))).toHaveLength(100);
	});
});
