import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { AI_PROVIDERS, type AiProvider } from '$lib/ai-providers';
import { getOrCreateDraftId, saveDraft } from '$lib/server/onboarding-draft';
import { encryptSecret } from '$lib/server/crypto';

function isAiProvider(value: string): value is AiProvider {
	return value in AI_PROVIDERS;
}

export const actions: Actions = {
	default: async ({ request, cookies, platform }) => {
		const form = await request.formData();
		const provider = form.get('provider');
		const model = form.get('model');
		const apiKey = form.get('apiKey');

		if (typeof provider !== 'string' || !isAiProvider(provider)) {
			return fail(400, { error: 'Selecione um provedor de IA válido.' });
		}
		if (
			typeof model !== 'string' ||
			!(AI_PROVIDERS[provider].models as readonly string[]).includes(model)
		) {
			return fail(400, { error: 'Selecione um modelo válido.' });
		}
		if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
			return fail(400, { error: 'Informe sua API key.' });
		}

		const encrypted = await encryptSecret(platform!.env.MASTER_KEY, apiKey.trim());
		const draftId = getOrCreateDraftId(cookies);
		await saveDraft(platform!.env.SESSIONS, draftId, {
			aiProvider: provider,
			aiModel: model,
			aiKeyEncrypted: encrypted.ciphertext,
			aiKeyNonce: encrypted.nonce
		});

		redirect(303, '/onboarding/google');
	}
};
