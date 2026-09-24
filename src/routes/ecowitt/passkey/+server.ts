import { error, json } from '@sveltejs/kit';
import { config } from '$lib/server/config';
import { getSeenPasskey, LOOPBACK } from '$lib/server/passkey';
import type { RequestHandler } from './$types';

/**
 * Setup-Hilfe: zuletzt empfangener Station-PASSKEY. Nur direkt von localhost
 * (ohne Proxy-Header) und nur solange ECOWITT_PASSKEY nicht gesetzt ist.
 */
export const GET: RequestHandler = ({ request, getClientAddress }) => {
	let client: string | null;
	try {
		client = getClientAddress();
	} catch {
		client = null;
	}
	const viaProxy = request.headers.has('x-forwarded-for') || request.headers.has('forwarded');
	if (!client || !LOOPBACK.has(client) || viaProxy) {
		error(403, 'nur direkt von localhost (ohne Proxy)');
	}
	if (config.passkey) error(404, 'passkey bereits konfiguriert');
	const pk = getSeenPasskey();
	if (!pk) error(404, 'noch kein Upload von der Station empfangen');
	return json({ passkey: pk });
};
