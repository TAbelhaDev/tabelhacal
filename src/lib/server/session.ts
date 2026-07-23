// Sessões via cookie → user_id em KV (sem Better Auth — ver STACK.md).
// Chave prefixada com "session:" porque o mesmo namespace KV (SESSIONS) também
// guarda drafts de onboarding e estados de OAuth (ver onboarding-draft.ts e
// oauth-state.ts) — o prefixo evita colisão entre esses três usos.
import type { Cookies } from '@sveltejs/kit';

const COOKIE_NAME = 'session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function kvKey(sessionId: string): string {
	return `session:${sessionId}`;
}

export async function createSession(
	kv: KVNamespace,
	cookies: Cookies,
	userId: string
): Promise<void> {
	const sessionId = crypto.randomUUID();
	await kv.put(kvKey(sessionId), userId, { expirationTtl: SESSION_TTL_SECONDS });
	cookies.set(COOKIE_NAME, sessionId, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: SESSION_TTL_SECONDS
	});
}

export async function getUserId(kv: KVNamespace, cookies: Cookies): Promise<string | null> {
	const sessionId = cookies.get(COOKIE_NAME);
	if (!sessionId) return null;
	return kv.get(kvKey(sessionId));
}

export async function destroySession(kv: KVNamespace, cookies: Cookies): Promise<void> {
	const sessionId = cookies.get(COOKIE_NAME);
	if (sessionId) await kv.delete(kvKey(sessionId));
	cookies.delete(COOKIE_NAME, { path: '/' });
}
