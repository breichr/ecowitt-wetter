import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

// Idempotent: legt Tabelle/Index nur an, wenn sie fehlen. Eine bestehende
// Datenbank der Python-Version bleibt unverändert.
const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS wetterdaten (
	id             INTEGER PRIMARY KEY AUTOINCREMENT,
	timestamp      DATETIME NOT NULL,
	model          TEXT,
	temperature    REAL,
	humidity       REAL,
	pressure       REAL,
	pressureabs    REAL,
	windspeed      REAL,
	windgust       REAL,
	maxdailygust   REAL,
	winddir        REAL,
	solar          REAL,
	uv             REAL,
	indoortemp     REAL,
	indoorhumidity REAL,
	vpd            REAL,
	rainrate       REAL,
	rainlast24hrs  REAL,
	raintoday      REAL,
	rainweek       REAL,
	rainmonth      REAL,
	rainyear       REAL,
	batt_sensor    INTEGER,
	batt_console   REAL
);
CREATE INDEX IF NOT EXISTS idx_wetterdaten_timestamp ON wetterdaten(timestamp);
`;

// Spalten, die in älteren Datenbanken fehlen können (vor Batterie-/Solar-Erweiterung).
const OPTIONAL_COLUMNS: Record<string, string> = {
	pressureabs: 'REAL',
	windgust: 'REAL',
	maxdailygust: 'REAL',
	solar: 'REAL',
	uv: 'REAL',
	indoortemp: 'REAL',
	indoorhumidity: 'REAL',
	vpd: 'REAL',
	batt_sensor: 'INTEGER',
	batt_console: 'REAL'
};

export function openDb(path: string): Db {
	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
	const sqlite = new Database(path);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('synchronous = NORMAL');
	sqlite.pragma('busy_timeout = 5000');
	sqlite.exec(BOOTSTRAP_SQL);

	const existing = new Set(
		(sqlite.prepare('PRAGMA table_info(wetterdaten)').all() as { name: string }[]).map(
			(c) => c.name
		)
	);
	for (const [name, type] of Object.entries(OPTIONAL_COLUMNS)) {
		if (!existing.has(name)) sqlite.exec(`ALTER TABLE wetterdaten ADD COLUMN ${name} ${type}`);
	}

	return drizzle(sqlite, { schema });
}

let instance: Db | undefined;

export function getDb(): Db {
	instance ??= openDb(config.databasePath);
	return instance;
}
