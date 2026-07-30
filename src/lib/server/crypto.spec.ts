import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from './crypto';

describe('encryptSecret/decryptSecret', () => {
	it('round-trips a plaintext through the same master key', async () => {
		const payload = await encryptSecret('master-key-de-teste', 'segredo-do-usuario');
		const plaintext = await decryptSecret('master-key-de-teste', payload);
		expect(plaintext).toBe('segredo-do-usuario');
	});

	it('produces a different nonce (and ciphertext) on every call, even for the same plaintext', async () => {
		const a = await encryptSecret('master-key-de-teste', 'mesmo-segredo');
		const b = await encryptSecret('master-key-de-teste', 'mesmo-segredo');
		expect(a.nonce).not.toBe(b.nonce);
		expect(a.ciphertext).not.toBe(b.ciphertext);
	});

	it('fails to decrypt with a different master key', async () => {
		const payload = await encryptSecret('master-key-a', 'segredo');
		await expect(decryptSecret('master-key-b', payload)).rejects.toThrow();
	});

	it('accepts a master key of any length (hashed to a fixed-size AES-GCM key)', async () => {
		const payload = await encryptSecret('curta', 'segredo');
		const plaintext = await decryptSecret('curta', payload);
		expect(plaintext).toBe('segredo');
	});
});
