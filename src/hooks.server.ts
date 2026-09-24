import { json, type Handle, type ServerInit } from '@sveltejs/kit';
import { config } from '$lib/server/config';
import { getDb } from '$lib/server/db/client';
import { blockedByIngestHost, corsHeaders } from '$lib/server/guards';
import { refreshLatest } from '$lib/server/weather';

export const init: ServerInit = () => {
	if (!config.passkey) {
		console.warn(
			'ECOWITT_PASSKEY ist nicht gesetzt: /ecowitt akzeptiert Schreibzugriffe von JEDEM, ' +
				'der den Server erreicht. PASSKEY der Station als ECOWITT_PASSKEY setzen.'
		);
	}
	// Letzte bekannte Werte sofort nach dem Start anzeigen.
	refreshLatest(getDb());
	console.info(`Datenbank: ${config.databasePath} · Station: ${config.stationName}`);
};

export const handle: Handle = async ({ event, resolve }) => {
	const { request, url } = event;

	if (blockedByIngestHost(config.ingestHost, request.headers, request.method, url.pathname)) {
		return json({ detail: 'not found' }, { status: 404 });
	}

	if (url.pathname.startsWith('/api/')) {
		const cors = corsHeaders(config.corsOrigins, request.headers.get('origin'));
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: cors
					? {
							...cors,
							'access-control-allow-methods': 'GET',
							'access-control-allow-headers':
								request.headers.get('access-control-request-headers') ?? '*',
							'access-control-max-age': '600'
						}
					: {}
			});
		}
		const response = await resolve(event);
		if (cors) for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
		return response;
	}

	return resolve(event);
};
