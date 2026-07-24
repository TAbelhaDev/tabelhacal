import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { aiCredentials, users } from '$lib/server/db/schema';
import { decryptSecret } from '$lib/server/crypto';
import { parseCommandFromText } from '$lib/server/ai/parse';
import type { AiProvider } from '$lib/ai-providers';
import { getUserAccessToken } from '$lib/server/google/tokens';
import {
	listCalendars,
	listCalendarEvents,
	type CalendarEventSummary
} from '$lib/server/google/calendar';

const LOOKAHEAD_DAYS = 30;

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

	const now = new Date();
	const timeMax = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

	// Contexto de eventos existentes pra IA resolver referências em linguagem
	// natural (ex: "a reunião de amanhã com o João") e responder ao comando `list`.
	// Busca em todas as agendas conectadas, não só primary (ver ESCOPO.md).
	// Se o usuário ainda não conectou o Google Calendar, segue sem contexto.
	let calendarEvents: CalendarEventSummary[];
	try {
		const accessToken = await getUserAccessToken(db, masterKey, locals.userId);
		const calendars = await listCalendars(accessToken);
		const calendarIds = calendars.length > 0 ? calendars.map((c) => c.id) : ['primary'];
		calendarEvents = await listCalendarEvents(
			accessToken,
			now.toISOString(),
			timeMax.toISOString(),
			calendarIds
		);
	} catch {
		calendarEvents = [];
	}

	const command = await parseCommandFromText({
		provider: credentials.provider as AiProvider,
		model: credentials.model,
		apiKey,
		text,
		now: now.toISOString(),
		timezone: user.timezone,
		calendarEvents
	});

	return json(command);
};
