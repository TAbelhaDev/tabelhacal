import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildAuthUrl, exchangeCodeForTokens, refreshAccessToken, getUserEmail } from './oauth';

function mockFetchOnce(body: unknown, ok = true, status = ok ? 200 : 500) {
	return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
		ok,
		status,
		json: async () => body,
		text: async () => JSON.stringify(body)
	} as Response);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('buildAuthUrl', () => {
	it('builds a Google OAuth URL carrying client id, redirect uri, scope and state', () => {
		const url = new URL(
			buildAuthUrl('client-123', 'https://tabelhacal.example/auth/google/callback', 'state-abc')
		);

		expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
		expect(url.searchParams.get('client_id')).toBe('client-123');
		expect(url.searchParams.get('redirect_uri')).toBe(
			'https://tabelhacal.example/auth/google/callback'
		);
		expect(url.searchParams.get('state')).toBe('state-abc');
		expect(url.searchParams.get('access_type')).toBe('offline');
		expect(url.searchParams.get('scope')).toContain('calendar.events');
	});
});

describe('exchangeCodeForTokens', () => {
	it('posts an authorization_code grant and maps the response to GoogleTokens', async () => {
		const fetchSpy = mockFetchOnce({
			access_token: 'access-1',
			refresh_token: 'refresh-1',
			expires_in: 3600,
			scope: 'openid email'
		});

		const tokens = await exchangeCodeForTokens('client', 'secret', 'code-1', 'https://redirect');

		expect(tokens).toEqual({
			accessToken: 'access-1',
			refreshToken: 'refresh-1',
			expiresIn: 3600,
			scope: 'openid email'
		});
		const [, init] = fetchSpy.mock.calls[0];
		const body = new URLSearchParams(String(init?.body));
		expect(body.get('grant_type')).toBe('authorization_code');
		expect(body.get('code')).toBe('code-1');
	});

	it('throws when Google responds with an error status', async () => {
		mockFetchOnce({ error: 'invalid_grant' }, false);
		await expect(
			exchangeCodeForTokens('client', 'secret', 'bad-code', 'https://redirect')
		).rejects.toThrow('Google OAuth error');
	});
});

describe('refreshAccessToken', () => {
	it('posts a refresh_token grant', async () => {
		const fetchSpy = mockFetchOnce({
			access_token: 'access-2',
			expires_in: 3600,
			scope: 'openid email'
		});

		const tokens = await refreshAccessToken('client', 'secret', 'refresh-1');

		expect(tokens.accessToken).toBe('access-2');
		const [, init] = fetchSpy.mock.calls[0];
		const body = new URLSearchParams(String(init?.body));
		expect(body.get('grant_type')).toBe('refresh_token');
		expect(body.get('refresh_token')).toBe('refresh-1');
	});
});

describe('getUserEmail', () => {
	it('returns the email from the userinfo endpoint', async () => {
		mockFetchOnce({ email: 'ian@example.com' });
		const email = await getUserEmail('access-token');
		expect(email).toBe('ian@example.com');
	});

	it('throws when the userinfo response has no email', async () => {
		mockFetchOnce({});
		await expect(getUserEmail('access-token')).rejects.toThrow('não retornou e-mail');
	});

	it('throws when the userinfo request fails', async () => {
		mockFetchOnce({}, false);
		await expect(getUserEmail('access-token')).rejects.toThrow('Google userinfo error');
	});
});
