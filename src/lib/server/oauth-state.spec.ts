import { describe, it, expect, vi, afterEach } from 'vitest';
import { createOauthState, consumeOauthState } from './oauth-state';

function createMockKv() {
	const store = new Map<string, string>();
	return {
		kv: {
			put: vi.fn(async (key: string, value: string) => {
				store.set(key, value);
			}),
			get: vi.fn(async (key: string) => store.get(key) ?? null),
			delete: vi.fn(async (key: string) => {
				store.delete(key);
			})
		} as unknown as KVNamespace,
		store
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('createOauthState', () => {
	it('persists the payload JSON under an oauth_state: key and returns its id', async () => {
		const { kv, store } = createMockKv();

		const stateId = await createOauthState(kv, { mode: 'login', userId: 'user-1' });

		expect(stateId).toBeTruthy();
		expect(store.get(`oauth_state:${stateId}`)).toBe(
			JSON.stringify({ mode: 'login', userId: 'user-1' })
		);
	});

	it('supports an onboarding payload', async () => {
		const { kv, store } = createMockKv();

		const stateId = await createOauthState(kv, { mode: 'onboarding', draftId: 'draft-1' });

		expect(JSON.parse(store.get(`oauth_state:${stateId}`) ?? '')).toEqual({
			mode: 'onboarding',
			draftId: 'draft-1'
		});
	});
});

describe('consumeOauthState', () => {
	it('returns the payload and deletes the entry (single use)', async () => {
		const { kv, store } = createMockKv();
		store.set('oauth_state:abc', JSON.stringify({ mode: 'login', userId: 'user-1' }));

		const payload = await consumeOauthState(kv, 'abc');

		expect(payload).toEqual({ mode: 'login', userId: 'user-1' });
		expect(store.has('oauth_state:abc')).toBe(false);
	});

	it('returns null for an unknown state id', async () => {
		const { kv } = createMockKv();

		await expect(consumeOauthState(kv, 'unknown')).resolves.toBeNull();
	});

	it('cannot be consumed twice', async () => {
		const { kv, store } = createMockKv();
		store.set('oauth_state:abc', JSON.stringify({ mode: 'login', userId: 'user-1' }));

		await consumeOauthState(kv, 'abc');
		await expect(consumeOauthState(kv, 'abc')).resolves.toBeNull();
	});
});
