import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrCreateDraftId, readDraft } from '$lib/server/onboarding-draft';
import { createOauthState } from '$lib/server/oauth-state';
import { decryptSecret } from '$lib/server/crypto';
import { buildAuthUrl } from '$lib/server/google/oauth';
import { getDb } from '$lib/server/db';
import { findUserByEmail } from '$lib/server/db/users';
import { getUserGoogleClient } from '$lib/server/google/tokens';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	const mode = url.searchParams.get('mode');
	const kv = platform!.env.SESSIONS;
	const masterKey = platform!.env.MASTER_KEY;
	const redirectUri = `${url.origin}/auth/google/callback`;

	if (mode === 'onboarding') {
		const draftId = getOrCreateDraftId(cookies);
		const draft = await readDraft(kv, draftId);
		if (!draft.googleClientIdEncrypted || !draft.googleClientIdNonce) {
			error(400, 'Cole o Client ID/Secret do Google antes de conectar.');
		}

		const clientId = await decryptSecret(masterKey, {
			ciphertext: draft.googleClientIdEncrypted,
			nonce: draft.googleClientIdNonce
		});

		const state = await createOauthState(kv, { mode: 'onboarding', draftId });
		redirect(303, buildAuthUrl(clientId, redirectUri, state));
	}

	if (mode === 'login') {
		const email = url.searchParams.get('email');
		if (!email) error(400, 'Informe o e-mail cadastrado.');

		const db = getDb(platform!.env.DB);
		const user = await findUserByEmail(db, email);
		if (!user) error(404, 'Usuário não encontrado.');

		const client = await getUserGoogleClient(db, masterKey, user.id);
		if (!client) error(400, 'Este usuário ainda não configurou o Google Calendar.');

		const state = await createOauthState(kv, { mode: 'login', userId: user.id });
		redirect(303, buildAuthUrl(client.clientId, redirectUri, state));
	}

	error(400, 'Parâmetro "mode" inválido.');
};
