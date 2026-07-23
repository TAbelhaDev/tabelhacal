// Rascunho efêmero do onboarding (KV) — guarda o que o usuário preencheu nos
// passos de IA/Google *antes* de existir um user_id (que só nasce depois do
// callback do Google, já que o login também é via Google — ver ESCOPO.md §2).
import type { Cookies } from '@sveltejs/kit';
import type { AiProvider } from '$lib/ai-providers';

const COOKIE_NAME = 'onboarding_draft';
const DRAFT_TTL_SECONDS = 60 * 30; // 30 minutos

export interface OnboardingDraft {
	aiProvider?: AiProvider;
	aiModel?: string;
	aiKeyEncrypted?: string;
	aiKeyNonce?: string;
	googleClientIdEncrypted?: string;
	googleClientIdNonce?: string;
	googleClientSecretEncrypted?: string;
	googleClientSecretNonce?: string;
	timezone?: string;
}

function kvKey(draftId: string): string {
	return `draft:${draftId}`;
}

export function getOrCreateDraftId(cookies: Cookies): string {
	const existing = cookies.get(COOKIE_NAME);
	if (existing) return existing;

	const draftId = crypto.randomUUID();
	cookies.set(COOKIE_NAME, draftId, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: DRAFT_TTL_SECONDS
	});
	return draftId;
}

export async function readDraft(kv: KVNamespace, draftId: string): Promise<OnboardingDraft> {
	const raw = await kv.get(kvKey(draftId));
	return raw ? (JSON.parse(raw) as OnboardingDraft) : {};
}

export async function saveDraft(
	kv: KVNamespace,
	draftId: string,
	patch: Partial<OnboardingDraft>
): Promise<OnboardingDraft> {
	const current = await readDraft(kv, draftId);
	const next = { ...current, ...patch };
	await kv.put(kvKey(draftId), JSON.stringify(next), { expirationTtl: DRAFT_TTL_SECONDS });
	return next;
}

export async function deleteDraft(
	kv: KVNamespace,
	cookies: Cookies,
	draftId: string
): Promise<void> {
	await kv.delete(kvKey(draftId));
	cookies.delete(COOKIE_NAME, { path: '/' });
}
