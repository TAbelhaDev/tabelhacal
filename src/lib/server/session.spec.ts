import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { createSession, getUserId, destroySession } from './session';

interface KvEntry {
	value: string;
	expirationTtl?: number;
}

function createMockKv() {
	const store = new Map<string, KvEntry>();
	return {
		kv: {
			put: vi.fn(async (key: string, value: string, opts?: { expirationTtl?: number }) => {
				store.set(key, { value, expirationTtl: opts?.expirationTtl });
			}),
			get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
			delete: vi.fn(async (key: string) => {
				store.delete(key);
			})
		} as unknown as KVNamespace,
		store
	};
}

function createMockCookies() {
	const store = new Map<string, string>();
	const setCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
	return {
		cookies: {
			get: vi.fn((name: string) => store.get(name)),
			set: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
				store.set(name, value);
				setCalls.push({ name, value, options });
			}),
			delete: vi.fn((name: string) => {
				store.delete(name);
			})
		} as unknown as Cookies,
		store,
		setCalls
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('createSession', () => {
	it('stores the user id in KV under a session: key and sets an httpOnly cookie', async () => {
		const { kv, store: kvStore } = createMockKv();
		const { cookies, store: cookieStore, setCalls } = createMockCookies();

		await createSession(kv, cookies as Cookies, 'user-123');

		const sessionId = cookieStore.get('session');
		expect(sessionId).toBeDefined();
		expect(kvStore.get(`session:${sessionId}`)?.value).toBe('user-123');
		expect(setCalls).toHaveLength(1);
		expect(setCalls[0].name).toBe('session');
		expect(setCalls[0].value).toBe(sessionId);
		expect(setCalls[0].options.httpOnly).toBe(true);
		expect(setCalls[0].options.secure).toBe(true);
		expect(setCalls[0].options.sameSite).toBe('lax');
		expect(setCalls[0].options.path).toBe('/');
	});

	it('sets an expiration ttl on the KV entry (30 days)', async () => {
		const { kv, store: kvStore } = createMockKv();
		const { cookies, store: cookieStore } = createMockCookies();

		await createSession(kv, cookies as Cookies, 'user-123');

		const sessionId = cookieStore.get('session');
		expect(sessionId).toBeDefined();
		expect(kvStore.get(`session:${sessionId}`)?.expirationTtl).toBe(60 * 60 * 24 * 30);
	});
});

describe('getUserId', () => {
	it('returns null when there is no session cookie', async () => {
		const { kv } = createMockKv();
		const { cookies } = createMockCookies();

		await expect(getUserId(kv, cookies as Cookies)).resolves.toBeNull();
	});

	it('returns null when the session cookie has no KV entry (expired/cleared)', async () => {
		const { kv } = createMockKv();
		const { cookies, store } = createMockCookies();
		store.set('session', 'session-missing');

		await expect(getUserId(kv, cookies as Cookies)).resolves.toBeNull();
	});

	it('returns the user id from KV for an existing session', async () => {
		const { kv, store } = createMockKv();
		store.set('session:abc', { value: 'user-42' });
		const { cookies, store: cookieStore } = createMockCookies();
		cookieStore.set('session', 'abc');

		await expect(getUserId(kv, cookies as Cookies)).resolves.toBe('user-42');
	});
});

describe('destroySession', () => {
	it('deletes the KV entry and clears the cookie when a session exists', async () => {
		const { kv, store } = createMockKv();
		store.set('session:abc', { value: 'user-42' });
		const { cookies, store: cookieStore } = createMockCookies();
		cookieStore.set('session', 'abc');

		await destroySession(kv, cookies as Cookies);

		expect(store.has('session:abc')).toBe(false);
		expect(cookieStore.has('session')).toBe(false);
	});

	it('is a no-op when there is no session cookie', async () => {
		const { kv } = createMockKv();
		const { cookies, store } = createMockCookies();

		await destroySession(kv, cookies as Cookies);

		expect(store.size).toBe(0);
	});
});
