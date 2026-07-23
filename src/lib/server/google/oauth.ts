// Fluxo BYO OAuth Client — ver ESCOPO.md §2.3 e STACK.md.
// Escopo inclui openid+email: o login em si também é via Google (sem
// cadastro/senha própria — decisão de identidade do MVP), então o e-mail do
// userinfo é o que identifica/cria o usuário.
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const SCOPE = 'openid email https://www.googleapis.com/auth/calendar.events';

export function buildAuthUrl(clientId: string, redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: SCOPE,
		access_type: 'offline',
		prompt: 'consent',
		state
	});
	return `${GOOGLE_AUTH_URL}?${params}`;
}

export interface GoogleTokens {
	accessToken: string;
	refreshToken?: string;
	expiresIn: number;
	scope: string;
}

export async function exchangeCodeForTokens(
	clientId: string,
	clientSecret: string,
	code: string,
	redirectUri: string
): Promise<GoogleTokens> {
	return requestTokens({
		client_id: clientId,
		client_secret: clientSecret,
		code,
		redirect_uri: redirectUri,
		grant_type: 'authorization_code'
	});
}

export async function refreshAccessToken(
	clientId: string,
	clientSecret: string,
	refreshToken: string
): Promise<GoogleTokens> {
	return requestTokens({
		client_id: clientId,
		client_secret: clientSecret,
		refresh_token: refreshToken,
		grant_type: 'refresh_token'
	});
}

export async function getUserEmail(accessToken: string): Promise<string> {
	const res = await fetch(GOOGLE_USERINFO_URL, {
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new Error(`Google userinfo error: ${res.status} ${await res.text()}`);
	const data = (await res.json()) as { email?: string };
	if (!data.email) throw new Error('Google userinfo não retornou e-mail');
	return data.email;
}

async function requestTokens(params: Record<string, string>): Promise<GoogleTokens> {
	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams(params)
	});
	if (!res.ok) throw new Error(`Google OAuth error: ${res.status} ${await res.text()}`);
	const data = (await res.json()) as {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
		scope: string;
	};
	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		expiresIn: data.expires_in,
		scope: data.scope
	};
}
