import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getOrCreateDraftId, saveDraft } from '$lib/server/onboarding-draft';
import { encryptSecret } from '$lib/server/crypto';

export const load: PageServerLoad = ({ url }) => {
	return { redirectUri: `${url.origin}/auth/google/callback` };
};

export const actions: Actions = {
	default: async ({ request, cookies, platform }) => {
		const form = await request.formData();
		const clientId = form.get('clientId');
		const clientSecret = form.get('clientSecret');
		const timezone = form.get('timezone');

		if (typeof clientId !== 'string' || clientId.trim().length === 0) {
			return fail(400, { error: 'Informe o Client ID.' });
		}
		if (typeof clientSecret !== 'string' || clientSecret.trim().length === 0) {
			return fail(400, { error: 'Informe o Client Secret.' });
		}

		const masterKey = platform!.env.MASTER_KEY;
		const encryptedId = await encryptSecret(masterKey, clientId.trim());
		const encryptedSecret = await encryptSecret(masterKey, clientSecret.trim());

		const draftId = getOrCreateDraftId(cookies);
		await saveDraft(platform!.env.SESSIONS, draftId, {
			googleClientIdEncrypted: encryptedId.ciphertext,
			googleClientIdNonce: encryptedId.nonce,
			googleClientSecretEncrypted: encryptedSecret.ciphertext,
			googleClientSecretNonce: encryptedSecret.nonce,
			timezone: typeof timezone === 'string' && timezone.trim().length > 0 ? timezone.trim() : 'UTC'
		});

		redirect(303, '/auth/google/start?mode=onboarding');
	}
};
