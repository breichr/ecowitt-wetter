import { config } from '$lib/server/config';
import { getDb } from '$lib/server/db/client';
import { handleIngest } from '$lib/server/ingest';
import type { RequestHandler } from './$types';

/** Empfänger für Ecowitt-Custom-Uploads (WSView: Protokoll Ecowitt, Pfad /ecowitt). */
export const POST: RequestHandler = ({ request }) => handleIngest(request, getDb(), config.passkey);
