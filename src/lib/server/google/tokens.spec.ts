import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encryptSecret } from '../crypto';
import { getUserGoogleClient, getUserAccessToken } from './tokens';
import { refreshAccessToken } from './oauth';
import { googleOauthClients, googleTokens } from '../db/schema';
import { createMockDb } from '../db/mock-db';

vi.mock('./oauth', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./oauth')>();
	return { ...actual, refreshAccessToken: vi.fn() };
});

const mockedRefresh = vi.mocked(refreshAccessToken);

beforeEach(() => {
	mockedRefresh.mockResolvedValue({
		accessToken: 'access-token-1',
		expiresIn: 3600,
		scope: 'openid email'
	});
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('getUserGoogleClient', () => {
	it('returns null when the user has no OAuth client configured', async () => {
		const { db } = createMockDb();

		await expect(getUserGoogleClient(db, 'master-key', 'user-1')).resolves.toBeNull();
	});

	it('returns the decrypted client id and secret', async () => {
		const { db, setSelectResults } = createMockDb();
		const clientId = await encryptSecret('master-key', 'client-id-123');
		const clientSecret = await encryptSecret('master-key', 'client-secret-456');
		setSelectResults(googleOauthClients, [
			{
				clientIdEncrypted: clientId.ciphertext,
				clientIdNonce: clientId.nonce,
				clientSecretEncrypted: clientSecret.ciphertext,
				clientSecretNonce: clientSecret.nonce
			}
		]);

		await expect(getUserGoogleClient(db, 'master-key', 'user-1')).resolves.toEqual({
			clientId: 'client-id-123',
			clientSecret: 'client-secret-456'
		});
	});
});

describe('getUserAccessToken', () => {
	it('throws when the user has no OAuth client configured', async () => {
		const { db } = createMockDb();

		await expect(getUserAccessToken(db, 'master-key', 'user-1')).rejects.toThrow(
			'Usuário não configurou um Google OAuth Client'
		);
	});

	it('throws when the user has no stored Google tokens', async () => {
		const { db, setSelectResults } = createMockDb();
		const clientId = await encryptSecret('master-key', 'client-id-123');
		const clientSecret = await encryptSecret('master-key', 'client-secret-456');
		setSelectResults(googleOauthClients, [
			{
				clientIdEncrypted: clientId.ciphertext,
				clientIdNonce: clientId.nonce,
				clientSecretEncrypted: clientSecret.ciphertext,
				clientSecretNonce: clientSecret.nonce
			}
		]);

		await expect(getUserAccessToken(db, 'master-key', 'user-1')).rejects.toThrow(
			'Usuário não conectou o Google Calendar'
		);
	});

	it('decrypts the refresh token and returns the refreshed access token', async () => {
		const { db, setSelectResults } = createMockDb();
		const clientId = await encryptSecret('master-key', 'client-id-123');
		const clientSecret = await encryptSecret('master-key', 'client-secret-456');
		const refreshToken = await encryptSecret('master-key', 'refresh-token-abc');
		setSelectResults(googleOauthClients, [
			{
				clientIdEncrypted: clientId.ciphertext,
				clientIdNonce: clientId.nonce,
				clientSecretEncrypted: clientSecret.ciphertext,
				clientSecretNonce: clientSecret.nonce
			}
		]);
		setSelectResults(googleTokens, [
			{
				refreshTokenEncrypted: refreshToken.ciphertext,
				nonce: refreshToken.nonce
			}
		]);

		const accessToken = await getUserAccessToken(db, 'master-key', 'user-1');

		expect(accessToken).toBe('access-token-1');
		expect(mockedRefresh).toHaveBeenCalledWith(
			'client-id-123',
			'client-secret-456',
			'refresh-token-abc'
		);
	});
});
