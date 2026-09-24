import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Tabelle der Messwerte – identisch zum Schema der Python-Version, damit eine
 * bestehende wetterdaten.db unverändert weiterverwendet werden kann.
 * `timestamp` ist Lokalzeit als Text ("YYYY-MM-DD HH:MM:SS"; Altdaten ggf. mit
 * Mikrosekunden), passend zu SQLite-Ausdrücken mit 'localtime'.
 */
export const wetterdaten = sqliteTable(
	'wetterdaten',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		timestamp: text('timestamp').notNull(),
		model: text('model'),
		temperature: real('temperature'), // °C
		humidity: real('humidity'), // %
		pressure: real('pressure'), // hPa, auf NN reduziert
		pressureabs: real('pressureabs'), // hPa, absolut
		windspeed: real('windspeed'), // km/h
		windgust: real('windgust'), // km/h
		maxdailygust: real('maxdailygust'), // km/h
		winddir: real('winddir'), // Grad
		solar: real('solar'), // W/m²
		uv: real('uv'),
		indoortemp: real('indoortemp'), // °C
		indoorhumidity: real('indoorhumidity'), // %
		vpd: real('vpd'), // kPa
		rainrate: real('rainrate'), // mm/h
		rainlast24hrs: real('rainlast24hrs'), // mm
		raintoday: real('raintoday'), // mm
		rainweek: real('rainweek'), // mm
		rainmonth: real('rainmonth'), // mm
		rainyear: real('rainyear'), // mm
		batt_sensor: integer('batt_sensor'), // 0 = ok, 1 = schwach
		batt_console: real('batt_console') // V
	},
	(t) => [index('idx_wetterdaten_timestamp').on(t.timestamp)]
);

export type Measurement = typeof wetterdaten.$inferSelect;
export type NewMeasurement = typeof wetterdaten.$inferInsert;
