import { toDbTimestamp } from '$lib/format';
import { openDb, type Db } from '../db/client';
import { wetterdaten, type NewMeasurement } from '../db/schema';

export function memoryDb(): Db {
	return openDb(':memory:');
}

export function hoursAgo(h: number, now = new Date()): string {
	return toDbTimestamp(new Date(now.getTime() - h * 3_600_000));
}

export function insert(db: Db, rows: Partial<NewMeasurement>[]): void {
	for (const r of rows) {
		db.insert(wetterdaten)
			.values({ timestamp: toDbTimestamp(new Date()), ...r })
			.run();
	}
}

/** Echter Upload einer GW1000/WS2900 (gekürzt), imperial. */
export const SAMPLE_PAYLOAD: Record<string, string> = {
	PASSKEY: 'ABCDEF0123456789',
	stationtype: 'EasyWeatherPro_V5.1.6',
	runtime: '3',
	dateutc: '2026-04-01 10:00:00',
	tempinf: '71.6',
	humidityin: '45',
	baromrelin: '30.012',
	baromabsin: '27.766',
	tempf: '53.6',
	humidity: '78',
	winddir: '247',
	windspeedmph: '4.47',
	windgustmph: '8.05',
	maxdailygust: '12.53',
	solarradiation: '312.45',
	uv: '2',
	vpd: '0.225',
	rainratein: '0.012',
	eventrainin: '0.024',
	hourlyrainin: '0.012',
	last24hrainin: '0.110',
	dailyrainin: '0.071',
	weeklyrainin: '0.339',
	monthlyrainin: '1.024',
	yearlyrainin: '9.303',
	wh65batt: '0',
	console_batt: '1.30',
	freq: '868M',
	model: 'WS2900_V2.02.03',
	interval: '16'
};

export function formOf(obj: Record<string, string>): URLSearchParams {
	return new URLSearchParams(obj);
}
