/**
 * Einmalige Migration einer Datenbank aus sehr alten Versionen (vor dem
 * aktuellen Schema):
 *   - redundante Spalten 'time' und 'shorttime' entfernen
 *   - 'humidity' und 'windspeed' von TEXT nach REAL
 *   - 'windspeed' von mph nach km/h
 *   - 'winddir' von Kompasstext nach Grad
 *   - historischen Absolutdruck auf Seehöhe reduzieren
 *   - Index auf 'timestamp'
 *
 * Aufruf: node --experimental-strip-types scripts/migrate-legacy.ts <db-pfad> [seehöhe-m]
 * Vorher ein Backup der .db-Datei anlegen!
 */
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

const COMPASS_TO_DEG: Record<string, number> = {
	N: 0,
	NO: 45,
	O: 90,
	SO: 135,
	S: 180,
	SW: 225,
	W: 270,
	NW: 315
};

function reduceToSeaLevel(pAbs: number | null, t: number | null, h: number): number | null {
	if (pAbs === null || t === null) return pAbs;
	return pAbs * (1 - (0.0065 * h) / (t + 273.15 + 0.0065 * h)) ** -5.257;
}

const [path, elevationArg] = process.argv.slice(2);
if (!path) {
	console.error(
		'Usage: node --experimental-strip-types scripts/migrate-legacy.ts <db-pfad> [seehöhe-m]'
	);
	process.exit(1);
}
if (!existsSync(path)) {
	console.error(`DB nicht gefunden: ${path}`);
	process.exit(1);
}
const elevation = Number(elevationArg ?? process.env.STATION_ELEVATION_M ?? 0);

const db = new Database(path);
db.function('compass_to_deg', (c: unknown) =>
	typeof c === 'string' ? (COMPASS_TO_DEG[c] ?? null) : null
);
db.function('reduce_p', (p: unknown, t: unknown) =>
	reduceToSeaLevel(p as number | null, t as number | null, elevation)
);

const count = () => (db.prepare('SELECT COUNT(*) AS c FROM wetterdaten').get() as { c: number }).c;
const before = count();
console.log(`Zeilen vor Migration: ${before} (Seehöhe ${elevation} m)`);

db.transaction(() => {
	db.exec(`
		CREATE TABLE wetterdaten_new (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			timestamp DATETIME NOT NULL,
			model TEXT,
			temperature REAL,
			humidity REAL,
			pressure REAL,
			windspeed REAL,
			winddir REAL,
			rainrate REAL,
			rainlast24hrs REAL,
			raintoday REAL,
			rainweek REAL,
			rainmonth REAL,
			rainyear REAL
		);
		INSERT INTO wetterdaten_new (
			id, timestamp, model, temperature, humidity, pressure, windspeed, winddir,
			rainrate, rainlast24hrs, raintoday, rainweek, rainmonth, rainyear
		)
		SELECT id, timestamp, model, temperature,
		       CAST(humidity AS REAL),
		       ROUND(reduce_p(pressure, temperature), 1),
		       ROUND(CAST(windspeed AS REAL) * 1.609344, 1),
		       compass_to_deg(winddir),
		       rainrate, rainlast24hrs, raintoday, rainweek, rainmonth, rainyear
		FROM wetterdaten;
		DROP TABLE wetterdaten;
		ALTER TABLE wetterdaten_new RENAME TO wetterdaten;
		CREATE INDEX idx_wetterdaten_timestamp ON wetterdaten(timestamp);
	`);
})();

const after = count();
console.log(`Zeilen nach Migration: ${after}`);
if (before !== after) throw new Error('Zeilenzahl hat sich geändert!');
console.log('VACUUM…');
db.exec('VACUUM');
db.close();
console.log('Fertig. Fehlende neuere Spalten legt die App beim Start automatisch an.');
