import { describe, expect, it } from 'vitest';
import { blockedByIngestHost, corsHeaders, requestHost } from '../guards';
import { handleIngest } from '../ingest';
import { getLatest } from '../weather';
import { formOf, memoryDb, SAMPLE_PAYLOAD } from './helpers';

const post = (body: string, headers: Record<string, string> = {}) =>
	new Request('http://localhost/ecowitt', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
		body
	});

describe('handleIngest', () => {
	it('stores a valid upload and refreshes the snapshot', async () => {
		const db = memoryDb();
		const res = await handleIngest(post(formOf(SAMPLE_PAYLOAD).toString()), db, 'ABCDEF0123456789');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ status: 'ok' });
		expect(getLatest()?.temperature).toBe(12);
		expect(getLatest()?.winddir).toBe('WSW');
	});

	it('rejects a wrong PASSKEY with 401', async () => {
		const db = memoryDb();
		const res = await handleIngest(post(formOf(SAMPLE_PAYLOAD).toString()), db, 'other');
		expect(res.status).toBe(401);
	});

	it('accepts any PASSKEY when none is configured', async () => {
		const res = await handleIngest(post(formOf(SAMPLE_PAYLOAD).toString()), memoryDb(), '');
		expect(res.status).toBe(200);
	});

	it('rejects oversized bodies with 413', async () => {
		const res = await handleIngest(
			post('a=1', { 'content-length': String(64 * 1024) }),
			memoryDb(),
			''
		);
		expect(res.status).toBe(413);
	});

	it('ignores sensor dropouts', async () => {
		const body = formOf({ ...SAMPLE_PAYLOAD, humidity: '0' }).toString();
		const res = await handleIngest(post(body), memoryDb(), '');
		expect(await res.json()).toEqual({ status: 'ignored', reason: 'outdoor sensor offline' });
	});
});

describe('guards', () => {
	const h = (o: Record<string, string>) => new Headers(o);

	it('extracts the request host', () => {
		expect(requestHost(h({ host: 'Wetter.Example:8080' }))).toBe('wetter.example');
		expect(requestHost(h({ host: 'a', 'x-forwarded-host': 'ingest.example, proxy' }))).toBe(
			'ingest.example'
		);
	});

	it('restricts the ingest host to POST /ecowitt', () => {
		const ingest = h({ host: 'ingest.example' });
		expect(blockedByIngestHost('ingest.example', ingest, 'POST', '/ecowitt')).toBe(false);
		expect(blockedByIngestHost('ingest.example', ingest, 'GET', '/')).toBe(true);
		expect(blockedByIngestHost('ingest.example', ingest, 'GET', '/api/latest')).toBe(true);
		expect(blockedByIngestHost('ingest.example', ingest, 'GET', '/ecowitt/passkey')).toBe(true);
		expect(blockedByIngestHost('ingest.example', h({ host: 'wetter.example' }), 'GET', '/')).toBe(
			false
		);
		expect(blockedByIngestHost('', ingest, 'GET', '/')).toBe(false);
	});

	it('computes CORS headers', () => {
		expect(corsHeaders(['*'], 'https://a.example')).toEqual({ 'access-control-allow-origin': '*' });
		expect(corsHeaders(['https://a.example'], 'https://a.example')).toEqual({
			'access-control-allow-origin': 'https://a.example',
			vary: 'Origin'
		});
		expect(corsHeaders(['https://a.example'], 'https://evil.example')).toBeNull();
		expect(corsHeaders([], 'https://a.example')).toBeNull();
	});
});
