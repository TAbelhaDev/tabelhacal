// Estado de uso único do fluxo OAuth do Google — amarra o callback de volta ao
// contexto que iniciou o redirect (onboarding de um usuário novo vs. login de
// um usuário existente), sem depender de cookie de sessão (que ainda não existe
// nesses dois casos).
const STATE_TTL_SECONDS = 60 * 10; // 10 minutos

export type OauthStatePayload =
	{ mode: 'onboarding'; draftId: string } | { mode: 'login'; userId: string };

function kvKey(stateId: string): string {
	return `oauth_state:${stateId}`;
}

export async function createOauthState(
	kv: KVNamespace,
	payload: OauthStatePayload
): Promise<string> {
	const stateId = crypto.randomUUID();
	await kv.put(kvKey(stateId), JSON.stringify(payload), { expirationTtl: STATE_TTL_SECONDS });
	return stateId;
}

// Consome (lê + apaga) — o state só pode ser usado uma vez.
export async function consumeOauthState(
	kv: KVNamespace,
	stateId: string
): Promise<OauthStatePayload | null> {
	const raw = await kv.get(kvKey(stateId));
	if (!raw) return null;
	await kv.delete(kvKey(stateId));
	return JSON.parse(raw) as OauthStatePayload;
}
