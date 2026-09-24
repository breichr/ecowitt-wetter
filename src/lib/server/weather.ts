import { sql } from 'drizzle-orm';
import { formatShort, parseDbTimestamp, round } from '$lib/format';
import type { Db } from './db/client';
import type { Measurement } from './db/schema';

export const CONSOLE_BATT_LOW = 1.2; // NiMH-Schwelle in V
export const STALE_THRESHOLD_SECONDS = 600; // 10 Minuten

const COMPASS = [
	'N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO',
	'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
]; // prettier-ignore

export function degToCompass(deg: number | null | undefined): string {
	if (deg === null || deg === undefined || !Number.isFinite(deg)) return '';
	const idx = Math.floor(deg / 22.5 + 0.5) % 16;
	return COMPASS[(idx + 16) % 16]!;
}

/** Taupunkt nach Magnus-Formel (°C). */
export function dewPoint(t: number | null, rh: number | null): number | null {
	if (t === null || rh === null || rh <= 0) return null;
	const a = 17.62;
	const b = 243.12;
	const gamma = Math.log(rh / 100) + (a * t) / (b + t);
	return round((b * gamma) / (a - gamma), 1);
}

export function batteryWarnings(battSensor: number | null, battConsole: number | null): string[] {
	const warnings: string[] = [];
	if (battSensor !== null && battSensor >= 1) warnings.push('Außensensor');
	if (battConsole !== null && battConsole > 0 && battConsole < CONSOLE_BATT_LOW) {
		warnings.push(`Konsole (${battConsole.toFixed(2)} V)`);
	}
	return warnings;
}

export type PressureTrend = { delta: number; symbol: string; label: string };

export function classifyPressureTrend(delta: number): PressureTrend {
	let symbol: string, label: string;
	if (delta >= 1.5) [symbol, label] = ['⬆', 'stark steigend'];
	else if (delta >= 0.5) [symbol, label] = ['⬈', 'steigend'];
	else if (delta > -0.5) [symbol, label] = ['', 'gleichbleibend'];
	else if (delta > -1.5) [symbol, label] = ['⬊', 'fallend'];
	else [symbol, label] = ['⬇', 'stark fallend'];
	return { delta: round(delta, 1), symbol, label };
}

/** 3-Stunden-Trend des reduzierten Luftdrucks. */
export function pressureTrend(db: Db): PressureTrend | null {
	const past = db.get<{ pressure: number | null } | undefined>(sql`
		SELECT pressure FROM wetterdaten
		WHERE timestamp <= datetime('now', 'localtime', '-3 hours')
		ORDER BY timestamp DESC LIMIT 1`);
	const current = db.get<{ pressure: number | null } | undefined>(
		sql`SELECT pressure FROM wetterdaten ORDER BY id DESC LIMIT 1`
	);
	if (!past || !current || past.pressure === null || current.pressure === null) return null;
	return classifyPressureTrend(current.pressure - past.pressure);
}

/**
 * Niederschlag der letzten 24 h aus dem kumulativen Jahreszähler.
 * Der 24-h-Puffer der Station (last24hrainin) ist nach einem Neustart bis zu
 * 24 h leer; rainyear überlebt Neustarts. null → Stationswert verwenden.
 */
export function rainLast24h(db: Db): number | null {
	const current = db.get<{ rainyear: number | null } | undefined>(
		sql`SELECT rainyear FROM wetterdaten ORDER BY id DESC LIMIT 1`
	);
	const past = db.get<{ rainyear: number | null } | undefined>(sql`
		SELECT rainyear FROM wetterdaten
		WHERE timestamp <= datetime('now', 'localtime', '-24 hours')
		ORDER BY timestamp DESC LIMIT 1`);
	if (!current || !past || current.rainyear === null || past.rainyear === null) return null;
	const delta = current.rainyear - past.rainyear;
	if (delta < 0) return null; // Zählerreset im Fenster
	return round(delta, 1);
}

export type MinMax = Partial<
	Record<`${'day' | 'month' | 'year'}${'min' | 'max'}temp${'' | 'time'}`, number | string>
>;

const RANGES = {
	day: [sql`date('now', 'localtime')`, sql`date('now', 'localtime', '+1 day')`],
	month: [
		sql`date('now', 'localtime', 'start of month')`,
		sql`date('now', 'localtime', 'start of month', '+1 month')`
	],
	year: [
		sql`date('now', 'localtime', 'start of year')`,
		sql`date('now', 'localtime', 'start of year', '+1 year')`
	]
} as const;

/** Tages-/Monats-/Jahres-Min/Max der Temperatur mit Zeitpunkt. */
export function computeMinMax(db: Db): MinMax {
	const out: MinMax = {};
	for (const [prefix, [lo, hi]] of Object.entries(RANGES) as [
		keyof typeof RANGES,
		(typeof RANGES)['day']
	][]) {
		for (const [kind, order] of [
			['min', sql.raw('ASC')],
			['max', sql.raw('DESC')]
		] as const) {
			const row = db.get<{ t: number | null; timestamp: string } | undefined>(sql`
				SELECT temperature AS t, timestamp FROM wetterdaten
				WHERE timestamp >= ${lo} AND timestamp < ${hi} AND temperature IS NOT NULL
				ORDER BY temperature ${order} LIMIT 1`);
			if (row && row.t !== null) {
				out[`${prefix}${kind}temp`] = row.t;
				out[`${prefix}${kind}temptime`] = formatShort(row.timestamp);
			}
		}
	}
	return out;
}

export type Snapshot = Omit<Measurement, 'winddir'> &
	MinMax & {
		time: string;
		shorttime: string;
		winddir: string;
		winddir_deg: number | null;
		dewpoint: number | null;
		pressure_trend: PressureTrend | null;
		battery_warnings: string[];
	};

const pad = (n: number) => String(n).padStart(2, '0');

/** Anzeige-Datensatz aus der jüngsten Messung + abgeleiteten Werten. */
export function buildSnapshot(db: Db, row: Measurement): Snapshot {
	const ts = parseDbTimestamp(row.timestamp);
	const time = ts
		? `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`
		: row.timestamp;
	const r24 = rainLast24h(db);
	return {
		...row,
		time,
		shorttime: ts ? formatShort(ts) : row.timestamp,
		winddir: degToCompass(row.winddir),
		winddir_deg: row.winddir,
		dewpoint: dewPoint(row.temperature, row.humidity),
		pressure_trend: pressureTrend(db),
		battery_warnings: batteryWarnings(row.batt_sensor, row.batt_console),
		rainlast24hrs: r24 ?? row.rainlast24hrs,
		...computeMinMax(db)
	};
}

// ---- Im Speicher gehaltener letzter Stand (wie latest_data der Python-Version) ----

let latest: Snapshot | null = null;

export function getLatest(): Snapshot | null {
	return latest;
}

/** Nach Ingest bzw. beim Start: letzten Datensatz laden und Snapshot neu berechnen. */
export function refreshLatest(db: Db): Snapshot | null {
	const row = db.get<Measurement | undefined>(
		sql`SELECT * FROM wetterdaten ORDER BY id DESC LIMIT 1`
	);
	latest = row ? buildSnapshot(db, row) : null;
	return latest;
}

export function dataAgeSeconds(snapshot: Snapshot | null, now = new Date()): number | null {
	if (!snapshot) return null;
	const ts = parseDbTimestamp(snapshot.timestamp);
	if (!ts) return null;
	return Math.trunc((now.getTime() - ts.getTime()) / 1000);
}

export function staleLabel(age: number | null): string | null {
	if (age === null || age <= STALE_THRESHOLD_SECONDS) return null;
	if (age < 3600) return `${Math.floor(age / 60)} min alt`;
	if (age < 86400) return `${Math.floor(age / 3600)} h alt`;
	return `${Math.floor(age / 86400)} d alt`;
}
