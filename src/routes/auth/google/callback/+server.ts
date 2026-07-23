import { error } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';
import type { RequestHandler } from './$types';
import { consumeOauthState } from '$lib/server/oauth-state';
import { readDraft, deleteDraft } from '$lib/server/onboarding-draft';
import { encryptSecret, decryptSecret } from '$lib/server/crypto';
import { exchangeCodeForTokens, getUserEmail } from '$lib/server/google/oauth';
import { getUserGoogleClient } from '$lib/server/google/tokens';
import { getDb } from '$lib/server/db';
import { findUserByEmail, createUser } from '$lib/server/db/users';
import { aiCredentials, googleOauthClients, googleTokens } from '$lib/server/db/schema';
import { createSession } from '$lib/server/session';
import { ToastType } from '$lib/enums/toast-type';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	const code = url.searchParams.get('code');
	const stateId = url.searchParams.get('state');
	if (!code || !stateId) error(400, 'Callback do Google incompleto.');

	const kv = platform!.env.SESSIONS;
	const masterKey = platform!.env.MASTER_KEY;
	const db = getDb(platform!.env.DB);
	const redirectUri = `${url.origin}/auth/google/callback`;

	const state = await consumeOauthState(kv, stateId);
	if (!state) error(400, 'Sessão de conexão com o Google expirou. Tente novamente.');

	if (state.mode === 'onboarding') {
		const draftId = state.draftId;
		const draft = await readDraft(kv, draftId);
		if (
			!draft.aiKeyEncrypted ||
			!draft.aiKeyNonce ||
			!draft.aiProvider ||
			!draft.aiModel ||
			!draft.googleClientIdEncrypted ||
			!draft.googleClientIdNonce ||
			!draft.googleClientSecretEncrypted ||
			!draft.googleClientSecretNonce
		) {
			error(400, 'Rascunho de onboarding incompleto. Reinicie o cadastro.');
		}

		const clientId = await decryptSecret(masterKey, {
			ciphertext: draft.googleClientIdEncrypted,
			nonce: draft.googleClientIdNonce
		});
		const clientSecret = await decryptSecret(masterKey, {
			ciphertext: draft.googleClientSecretEncrypted,
			nonce: draft.googleClientSecretNonce
		});

		const tokens = await exchangeCodeForTokens(clientId, clientSecret, code, redirectUri);
		const email = await getUserEmail(tokens.accessToken);

		let user = await findUserByEmail(db, email);
		if (!user) {
			user = await createUser(db, email, draft.timezone ?? 'UTC');

			await db.insert(aiCredentials).values({
				userId: user.id,
				provider: draft.aiProvider,
				model: draft.aiModel,
				keyEncrypted: draft.aiKeyEncrypted,
				nonce: draft.aiKeyNonce
			});

			await db.insert(googleOauthClients).values({
				userId: user.id,
				clientIdEncrypted: draft.googleClientIdEncrypted,
				clientIdNonce: draft.googleClientIdNonce,
				clientSecretEncrypted: draft.googleClientSecretEncrypted,
				clientSecretNonce: draft.googleClientSecretNonce
			});

			if (!tokens.refreshToken) {
				error(
					400,
					'Google não retornou refresh token. Remova o acesso do app na sua conta Google e tente de novo.'
				);
			}
			const refreshEncrypted = await encryptSecret(masterKey, tokens.refreshToken);
			await db.insert(googleTokens).values({
				userId: user.id,
				refreshTokenEncrypted: refreshEncrypted.ciphertext,
				nonce: refreshEncrypted.nonce,
				scope: tokens.scope,
				expiry: new Date(Date.now() + tokens.expiresIn * 1000)
			});
		}

		await deleteDraft(kv, cookies, draftId);
		await createSession(kv, cookies, user.id);
		redirect(
			'/chat',
			{ type: ToastType.success, message: 'Conta conectada! Bem-vindo ao Gosplan.' },
			cookies
		);
	}

	// mode === 'login'
	const userId = state.userId;
	const client = await getUserGoogleClient(db, masterKey, userId);
	if (!client) error(400, 'Usuário não tem um Google OAuth Client configurado.');

	const tokens = await exchangeCodeForTokens(
		client.clientId,
		client.clientSecret,
		code,
		redirectUri
	);

	if (tokens.refreshToken) {
		const refreshEncrypted = await encryptSecret(masterKey, tokens.refreshToken);
		await db
			.insert(googleTokens)
			.values({
				userId,
				refreshTokenEncrypted: refreshEncrypted.ciphertext,
				nonce: refreshEncrypted.nonce,
				scope: tokens.scope,
				expiry: new Date(Date.now() + tokens.expiresIn * 1000)
			})
			.onConflictDoUpdate({
				target: googleTokens.userId,
				set: {
					refreshTokenEncrypted: refreshEncrypted.ciphertext,
					nonce: refreshEncrypted.nonce,
					scope: tokens.scope,
					expiry: new Date(Date.now() + tokens.expiresIn * 1000)
				}
			});
	}

	await createSession(kv, cookies, userId);
	redirect('/chat', { type: ToastType.success, message: 'Login realizado.' }, cookies);
};
