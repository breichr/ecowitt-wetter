import { config } from './config';
import { logSafe } from './ecowitt';

// Zuletzt von der Station gesendeter PASSKEY – nur im Speicher, nie in der DB,
// und nur an localhost herausgegeben (siehe /ecowitt/passkey).
let seenPasskey: string | null = null;
let hinted = false;

export const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

export function getSeenPasskey(): string | null {
	return seenPasskey;
}

export function recordPasskey(passkey: string | null, stationType: string | null): void {
	if (!passkey) return;
	seenPasskey = passkey;
	if (!config.passkey && !hinted) {
		hinted = true;
		console.warn(
			`Station-PASSKEY empfangen: ${logSafe(passkey)} (stationtype=${logSafe(stationType ?? '?')}). ` +
				`Diesen Wert als ECOWITT_PASSKEY setzen und neu starten, um /ecowitt zu sichern. ` +
				`Auch abrufbar im Container via: node -e "fetch('http://127.0.0.1:${config.port}/ecowitt/passkey').then(r=>r.text()).then(console.log)"`
		);
	}
}
