const DAY_MS = 86_400_000;

/** Zeiträume der Verlaufsseite (Bucket = Aggregationsintervall der API). */
export const HISTORY_RANGES = {
	'24h': { ms: 1 * DAY_MS, bucket: '15m', label: '24 h' },
	'7d': { ms: 7 * DAY_MS, bucket: '1h', label: 'Woche' },
	'30d': { ms: 30 * DAY_MS, bucket: '1h', label: 'Monat' },
	'365d': { ms: 365 * DAY_MS, bucket: '1d', label: 'Jahr' }
} as const;
export type HistoryRange = keyof typeof HISTORY_RANGES;

export const HISTORY_METRICS = [
	{ key: 'temperature', label: 'Temperatur', unit: '°C' },
	{ key: 'rainrate', label: 'Regenrate', unit: 'mm/h' },
	{ key: 'humidity', label: 'Luftfeuchte', unit: '%' },
	{ key: 'pressure', label: 'Luftdruck', unit: 'hPa' },
	{ key: 'windspeed', label: 'Wind', unit: 'km/h' }
] as const;

export const MONTHS_LONG = [
	'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
	'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]; // prettier-ignore
export const MONTHS_SHORT = [
	'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
]; // prettier-ignore
