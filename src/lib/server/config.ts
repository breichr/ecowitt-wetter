import { z } from 'zod';

const csv = (value: string) =>
	value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

const schema = z.object({
	STATION_NAME: z.string().trim().min(1).default('Wetterstation'),
	STATION_ELEVATION_M: z.coerce.number().int().default(0),
	// Leer = keine Authentifizierung am Ingest-Endpoint.
	ECOWITT_PASSKEY: z.string().trim().default(''),
	// Kommagetrennte Liste; "*" = offen, leer = CORS aus.
	CORS_ORIGINS: z.string().default('*').transform(csv),
	// Optionaler getrennter Hostname für Station-Uploads (Split-Host hinter Reverse-Proxy).
	INGEST_HOST: z
		.string()
		.default('')
		.transform((s) => s.trim().toLowerCase()),
	DATABASE_PATH: z.string().trim().min(1).default('./data/wetterdaten.db'),
	PORT: z.coerce.number().int().default(3000)
});

export type Config = {
	stationName: string;
	stationElevation: number;
	passkey: string;
	corsOrigins: string[];
	ingestHost: string;
	databasePath: string;
	port: number;
};

export function loadConfig(env: Record<string, string | undefined>): Config {
	// Leere Strings aus der Umgebung (z. B. "KEY=" in Coolify) wie "nicht gesetzt" behandeln,
	// außer bei CORS_ORIGINS, wo leer bewusst "aus" bedeutet.
	const cleaned = Object.fromEntries(
		Object.entries(env).filter(([k, v]) => v !== undefined && (v !== '' || k === 'CORS_ORIGINS'))
	);
	const parsed = schema.parse(cleaned);
	return {
		stationName: parsed.STATION_NAME,
		stationElevation: parsed.STATION_ELEVATION_M,
		passkey: parsed.ECOWITT_PASSKEY,
		corsOrigins: parsed.CORS_ORIGINS,
		ingestHost: parsed.INGEST_HOST,
		databasePath: parsed.DATABASE_PATH,
		port: parsed.PORT
	};
}

export const config: Config = loadConfig(process.env);
