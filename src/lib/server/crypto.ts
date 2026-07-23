// Envelope encryption (AES-GCM/WebCrypto) para ai_credentials, google_oauth_clients
// e google_tokens — ver ESCOPO.md §5. MASTER_KEY é hasheada com SHA-256 pra sempre
// virar uma chave de 256 bits, então qualquer segredo (independente do tamanho) serve.

async function deriveKey(masterKey: string): Promise<CryptoKey> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(masterKey));
	return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

export interface EncryptedPayload {
	ciphertext: string;
	nonce: string;
}

export async function encryptSecret(
	masterKey: string,
	plaintext: string
): Promise<EncryptedPayload> {
	const key = await deriveKey(masterKey);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(plaintext)
	);
	return {
		ciphertext: toBase64(new Uint8Array(ciphertext)),
		nonce: toBase64(iv)
	};
}

export async function decryptSecret(masterKey: string, payload: EncryptedPayload): Promise<string> {
	const key = await deriveKey(masterKey);
	const plaintext = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: fromBase64(payload.nonce) },
		key,
		fromBase64(payload.ciphertext)
	);
	return new TextDecoder().decode(plaintext);
}
