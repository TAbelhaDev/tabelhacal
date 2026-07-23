import { eq } from 'drizzle-orm';
import type { getDb } from '$lib/server/db';
import { googleOauthClients, googleTokens } from '$lib/server/db/schema';
import { decryptSecret } from '$lib/server/crypto';
import { refreshAccessToken } from './oauth';

type Db = ReturnType<typeof getDb>;

export async function getUserGoogleClient(
	db: Db,
	masterKey: string,
	userId: string
): Promise<{ clientId: string; clientSecret: string } | null> {
	const [client] = await db
		.select()
		.from(googleOauthClients)
		.where(eq(googleOauthClients.userId, userId));
	if (!client) return null;

	const clientId = await decryptSecret(masterKey, {
		ciphertext: client.clientIdEncrypted,
		nonce: client.clientIdNonce
	});
	const clientSecret = await decryptSecret(masterKey, {
		ciphertext: client.clientSecretEncrypted,
		nonce: client.clientSecretNonce
	});
	return { clientId, clientSecret };
}

// Troca o refresh_token do usuário por um access_token novo — chamado a cada
// operação de Calendar API, já que o Worker não guarda access_token (de vida curta).
export async function getUserAccessToken(
	db: Db,
	masterKey: string,
	userId: string
): Promise<string> {
	const client = await getUserGoogleClient(db, masterKey, userId);
	if (!client) throw new Error('Usuário não configurou um Google OAuth Client');

	const [tokens] = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId));
	if (!tokens) throw new Error('Usuário não conectou o Google Calendar');

	const refreshToken = await decryptSecret(masterKey, {
		ciphertext: tokens.refreshTokenEncrypted,
		nonce: tokens.nonce
	});

	const refreshed = await refreshAccessToken(client.clientId, client.clientSecret, refreshToken);
	return refreshed.accessToken;
}
