import { json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import type { Db } from './db/client';
import { wetterdaten } from './db/schema';
import { parseEcowittPayload } from './ecowitt';
import { recordPasskey } from './passkey';
import { refreshLatest } from './weather';

export const MAX_ECOWITT_BODY = 32 * 1024; // Ecowitt-POSTs sind < 1 KB

function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** POST /ecowitt – Upload der Station entgegennehmen und speichern. */
export async function handleIngest(request: Request, db: Db, passkey: string): Promise<Response> {
	const len = Number(request.headers.get('content-length') ?? 0);
	if (Number.isFinite(len) && len > MAX_ECOWITT_BODY) {
		return json({ detail: 'payload too large' }, { status: 413 });
	}

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return json({ detail: 'invalid form data' }, { status: 400 });
	}

	const sent = form.get('PASSKEY');
	const sentStr = typeof sent === 'string' ? sent : '';
	if (passkey && !safeEqual(sentStr, passkey)) {
		return json({ detail: 'Invalid PASSKEY' }, { status: 401 });
	}

	const stationType = form.get('stationtype');
	recordPasskey(sentStr || null, typeof stationType === 'string' ? stationType : null);

	const parsed = parseEcowittPayload(form);
	if (!parsed.ok) return json({ status: 'ignored', reason: parsed.reason });

	db.insert(wetterdaten).values(parsed.record).run();
	refreshLatest(db);
	return json({ status: 'ok' });
}
