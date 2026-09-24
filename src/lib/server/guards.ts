/** Host der Anfrage (X-Forwarded-Host bevorzugt), ohne Port, klein geschrieben. */
export function requestHost(headers: Headers): string {
	const raw = headers.get('x-forwarded-host') || headers.get('host') || '';
	return (raw.split(',')[0] ?? '').split(':')[0]!.trim().toLowerCase();
}

/**
 * Split-Host-Betrieb: Über den Ingest-Host ist ausschließlich POST /ecowitt
 * erreichbar – Seiten, JSON-API und /ecowitt/passkey liefern dort 404.
 */
export function blockedByIngestHost(
	ingestHost: string,
	headers: Headers,
	method: string,
	pathname: string
): boolean {
	if (!ingestHost || requestHost(headers) !== ingestHost) return false;
	return !(method === 'POST' && pathname === '/ecowitt');
}

/** CORS-Header für GET /api/*; null = Origin nicht erlaubt bzw. CORS aus. */
export function corsHeaders(
	allowed: string[],
	origin: string | null
): Record<string, string> | null {
	if (!allowed.length || !origin) return null;
	if (allowed.includes('*')) {
		return { 'access-control-allow-origin': '*' };
	}
	if (allowed.includes(origin)) {
		return { 'access-control-allow-origin': origin, vary: 'Origin' };
	}
	return null;
}
