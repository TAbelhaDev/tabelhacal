import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { aiCredentials, users } from '$lib/server/db/schema';
import { decryptSecret } from '$lib/server/crypto';
import { parseEventFromText } from '$lib/server/ai/parse';
import type { AiProvider } from '$lib/ai-providers';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.userId) error(401, 'Não autenticado.');

	const { text } = (await request.json()) as { text?: string };
	if (!text || text.trim().length === 0) error(400, 'Informe um texto para interpretar.');

	const db = getDb(platform!.env.DB);
	const masterKey = platform!.env.MASTER_KEY;

	const [user] = await db.select().from(users).where(eq(users.id, locals.userId));
	if (!user) error(401, 'Usuário não encontrado.');

	const [credentials] = await db
		.select()
		.from(aiCredentials)
		.where(eq(aiCredentials.userId, locals.userId));
	if (!credentials) error(400, 'Configure sua chave de IA antes de usar o chat.');

	const apiKey = await decryptSecret(masterKey, {
		ciphertext: credentials.keyEncrypted,
		nonce: credentials.nonce
	});

	const draft = await parseEventFromText({
		provider: credentials.provider as AiProvider,
		model: credentials.model,
		apiKey,
		text,
		now: new Date().toISOString(),
		timezone: user.timezone
	});

	return json(draft);
};
