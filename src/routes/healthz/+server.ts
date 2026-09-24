import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import type { RequestHandler } from './$types';

/** Health-Check für Docker/Coolify: prüft, ob die Datenbank antwortet. */
export const GET: RequestHandler = () => {
	getDb().get(sql`SELECT 1`);
	return json({ status: 'ok' });
};
