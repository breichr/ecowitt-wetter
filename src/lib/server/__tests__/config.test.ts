import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config';

describe('loadConfig', () => {
	it('uses defaults', () => {
		expect(loadConfig({})).toEqual({
			stationName: 'Wetterstation',
			stationElevation: 0,
			passkey: '',
			corsOrigins: ['*'],
			ingestHost: '',
			databasePath: './data/wetterdaten.db',
			port: 3000
		});
	});

	it('parses environment values', () => {
		const c = loadConfig({
			STATION_NAME: 'Test',
			STATION_ELEVATION_M: '638',
			ECOWITT_PASSKEY: ' abc ',
			CORS_ORIGINS: 'https://a.example, https://b.example',
			INGEST_HOST: 'Ingest.Example',
			DATABASE_PATH: '/data/x.db',
			PORT: ''
		});
		expect(c).toMatchObject({
			stationName: 'Test',
			stationElevation: 638,
			passkey: 'abc',
			corsOrigins: ['https://a.example', 'https://b.example'],
			ingestHost: 'ingest.example',
			databasePath: '/data/x.db',
			port: 3000
		});
	});

	it('disables CORS with an empty value', () => {
		expect(loadConfig({ CORS_ORIGINS: '' }).corsOrigins).toEqual([]);
	});
});
