import { round, toDbTimestamp } from '$lib/format';
import type { NewMeasurement } from './db/schema';

const INHG_TO_HPA = 33.863889532611;
const MPH_TO_KMH = 1.609344;
const IN_TO_MM = 25.4;

type Form = { get(key: string): FormDataEntryValue | string | null | undefined };

/** Zahl aus einem Formularfeld; fehlend/ungültig/nicht-endlich → fallback. */
export function num(form: Form, key: string, fallback: number): number;
export function num(form: Form, key: string, fallback: null): number | null;
export function num(form: Form, key: string, fallback: number | null): number | null {
	const raw = form.get(key);
	if (raw === null || raw === undefined || typeof raw !== 'string' || raw.trim() === '') {
		return fallback;
	}
	const v = Number(raw);
	return Number.isFinite(v) ? v : fallback;
}

const fToC = (f: number) => ((f - 32) * 5) / 9;

export type ParseResult =
	{ ok: true; record: NewMeasurement & { timestamp: string } } | { ok: false; reason: string };

/**
 * Ecowitt-Custom-Upload (imperial) in einen metrischen Datensatz umwandeln.
 * Verwirft den Offline-Sentinel des Außensensors (humidity=0, tempf=-0 °F).
 */
export function parseEcowittPayload(form: Form, now = new Date()): ParseResult {
	const humidity = round(num(form, 'humidity', 0), 0);
	if (humidity === 0) return { ok: false, reason: 'outdoor sensor offline' };

	const battRaw = num(form, 'wh65batt', 0);
	const batt_sensor = Number.isFinite(battRaw) ? Math.trunc(battRaw) : null;
	const batt_console = num(form, 'console_batt', null);
	const model = form.get('model');

	return {
		ok: true,
		record: {
			timestamp: toDbTimestamp(now),
			model: typeof model === 'string' ? model : null,
			temperature: round(fToC(num(form, 'tempf', 0)), 1),
			humidity,
			pressure: round(num(form, 'baromrelin', 0) * INHG_TO_HPA, 1),
			pressureabs: round(num(form, 'baromabsin', 0) * INHG_TO_HPA, 1),
			windspeed: round(num(form, 'windspeedmph', 0) * MPH_TO_KMH, 1),
			windgust: round(num(form, 'windgustmph', 0) * MPH_TO_KMH, 1),
			maxdailygust: round(num(form, 'maxdailygust', 0) * MPH_TO_KMH, 1),
			winddir: num(form, 'winddir', 0),
			solar: round(num(form, 'solarradiation', 0), 1),
			uv: round(num(form, 'uv', 0), 1),
			indoortemp: round(fToC(num(form, 'tempinf', 0)), 1),
			indoorhumidity: round(num(form, 'humidityin', 0), 0),
			vpd: round(num(form, 'vpd', 0), 3),
			rainrate: round(num(form, 'rainratein', 0) * IN_TO_MM, 1),
			rainlast24hrs: round(num(form, 'last24hrainin', 0) * IN_TO_MM, 1),
			raintoday: round(num(form, 'dailyrainin', 0) * IN_TO_MM, 1),
			rainweek: round(num(form, 'weeklyrainin', 0) * IN_TO_MM, 1),
			rainmonth: round(num(form, 'monthlyrainin', 0) * IN_TO_MM, 1),
			rainyear: round(num(form, 'yearlyrainin', 0) * IN_TO_MM, 1),
			batt_sensor,
			batt_console
		}
	};
}

/** Steuerzeichen aus stationsseitigen Werten entfernen, bevor sie ins Log gehen. */
export function logSafe(value: unknown): string {
	// eslint-disable-next-line no-control-regex
	const control = /[\x00-\x1f\x7f]/g;
	return String(value).replace(control, '').slice(0, 100);
}
