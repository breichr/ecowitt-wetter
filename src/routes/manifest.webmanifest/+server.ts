import { config } from '$lib/server/config';
import { BACKGROUND_COLOR, THEME_COLOR } from '$lib/theme';
import type { RequestHandler } from './$types';

/** PWA-Manifest – dynamisch, damit der Stationsname als App-Name erscheint. */
export const GET: RequestHandler = () =>
	new Response(
		JSON.stringify({
			name: `${config.stationName} – Wetter`,
			short_name: 'Wetter',
			description: 'Aktuelle Werte, Verlauf und Klimadiagramm der Wetterstation',
			start_url: '/',
			scope: '/',
			display: 'standalone',
			orientation: 'portrait-primary',
			background_color: BACKGROUND_COLOR,
			theme_color: THEME_COLOR,
			icons: [
				{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
				{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
				{ src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
			]
		}),
		{ headers: { 'content-type': 'application/manifest+json' } }
	);
