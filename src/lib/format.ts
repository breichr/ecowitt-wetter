const pad = (n: number) => String(n).padStart(2, '0');

/** Lokalzeit als "YYYY-MM-DD HH:MM:SS" – das Format der timestamp-Spalte. */
export function toDbTimestamp(d: Date): string {
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
		`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
	);
}

/** DB-Zeitstempel (auch mit Mikrosekunden oder "T") als lokale Zeit parsen. */
export function parseDbTimestamp(ts: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(ts);
	if (!m) return null;
	const [, y, mo, d, h, mi, s] = m;
	return new Date(+y!, +mo! - 1, +d!, +h!, +mi!, s ? +s : 0);
}

/** "dd.mm. HH:MM" */
export function formatShort(ts: string | Date): string {
	const d = typeof ts === 'string' ? parseDbTimestamp(ts) : ts;
	if (!d) return String(ts);
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "3 h 12 min" / "45 min" */
export function formatDuration(seconds: number): string {
	const s = Math.trunc(seconds);
	if (s >= 3600) {
		const totalMin = Math.floor(s / 60);
		const h = Math.floor(totalMin / 60);
		const m = totalMin % 60;
		return m ? `${h} h ${m} min` : `${h} h`;
	}
	return `${Math.max(1, Math.floor(s / 60))} min`;
}

/** Rundet wie Python round(v, digits) für die hier vorkommenden Wertebereiche. */
export function round(value: number, digits = 0): number {
	const f = 10 ** digits;
	return Math.round(value * f) / f;
}
