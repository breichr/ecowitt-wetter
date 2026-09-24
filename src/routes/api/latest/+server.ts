import { json } from '@sveltejs/kit';
import { getLatest } from '$lib/server/weather';
import type { RequestHandler } from './$types';

/** Aktueller Messwert-Satz (identisch zur Anzeige auf der Hauptseite). */
export const GET: RequestHandler = () => json(getLatest() ?? {});
