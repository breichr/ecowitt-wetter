import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ out: 'build' }),
		// Die Ecowitt-Station schickt Form-POSTs ohne Origin-Header von einer
		// fremden IP; die CSRF-Prüfung von SvelteKit würde sie sonst abweisen.
		// /ecowitt ist über den PASSKEY geschützt.
		csrf: { trustedOrigins: ['*'] }
	}
};

export default config;
