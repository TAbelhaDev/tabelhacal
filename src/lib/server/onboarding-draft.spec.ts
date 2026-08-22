import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { getOrCreateDraftId, readDraft, saveDraft, deleteDraft } from './onboarding-draft';

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

function createMockCookies() {
	const store = new Map<string, string>();
	return {
		cookies: {
			get: vi.fn((name: string) => store.get(name)),
			set: vi.fn((name: string, value: string) => {
				store.set(name, value);
			}),
			delete: vi.fn((name: string) => {
				store.delete(name);
			})
		} as unknown as Cookies,
		store
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('getOrCreateDraftId', () => {
	it('creates a draft id and sets the cookie when none exists', () => {
		const { cookies, store } = createMockCookies();

		const id = getOrCreateDraftId(cookies as Cookies);

		expect(id).toBeTruthy();
		expect(store.get('onboarding_draft')).toBe(id);
	});

	it('reuses the existing draft id from the cookie', () => {
		const { cookies, store } = createMockCookies();
		store.set('onboarding_draft', 'draft-existing');

		const id = getOrCreateDraftId(cookies as Cookies);

		expect(id).toBe('draft-existing');
		expect(store.get('onboarding_draft')).toBe('draft-existing');
	});
});

describe('readDraft', () => {
	it('returns an empty object when the draft does not exist', async () => {
		const { kv } = createMockKv();

		await expect(readDraft(kv, 'missing')).resolves.toEqual({});
	});

	it('returns the stored draft as an object', async () => {
		const { kv, store } = createMockKv();
		store.set('draft:abc', JSON.stringify({ aiProvider: 'anthropic', timezone: 'UTC' }));

		await expect(readDraft(kv, 'abc')).resolves.toEqual({
			aiProvider: 'anthropic',
			timezone: 'UTC'
		});
	});
});

describe('saveDraft', () => {
	it('persists a patch and returns the merged draft', async () => {
		const { kv } = createMockKv();

		const first = await saveDraft(kv, 'abc', { aiProvider: 'deepseek' });
		const second = await saveDraft(kv, 'abc', { timezone: 'America/Sao_Paulo' });

		expect(first).toEqual({ aiProvider: 'deepseek' });
		expect(second).toEqual({ aiProvider: 'deepseek', timezone: 'America/Sao_Paulo' });
		await expect(readDraft(kv, 'abc')).resolves.toEqual({
			aiProvider: 'deepseek',
			timezone: 'America/Sao_Paulo'
		});
	});
});

describe('deleteDraft', () => {
	it('removes the KV entry and clears the cookie', async () => {
		const { kv, store } = createMockKv();
		store.set('draft:abc', JSON.stringify({ aiProvider: 'anthropic' }));
		const { cookies, store: cookieStore } = createMockCookies();
		cookieStore.set('onboarding_draft', 'abc');

		await deleteDraft(kv, cookies as Cookies, 'abc');

		expect(store.has('draft:abc')).toBe(false);
		expect(cookieStore.has('onboarding_draft')).toBe(false);
	});
});
