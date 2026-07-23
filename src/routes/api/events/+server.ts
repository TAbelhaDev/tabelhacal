import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { users, events } from '$lib/server/db/schema';
import { getUserAccessToken } from '$lib/server/google/tokens';
import { createCalendarEvent } from '$lib/server/google/calendar';
import type { EventDraft } from '$lib/server/ai/parse';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.userId) error(401, 'Não autenticado.');

	const draft = (await request.json()) as EventDraft;
	if (!draft.title || !draft.startAt || !draft.endAt) {
		error(400, 'Evento incompleto.');
	}

	const db = getDb(platform!.env.DB);
	const masterKey = platform!.env.MASTER_KEY;

	const [user] = await db.select().from(users).where(eq(users.id, locals.userId));
	if (!user) error(401, 'Usuário não encontrado.');

	const accessToken = await getUserAccessToken(db, masterKey, locals.userId);
	const calendarEvent = await createCalendarEvent(accessToken, {
		title: draft.title,
		startAt: draft.startAt,
		endAt: draft.endAt,
		timezone: user.timezone,
		location: draft.location,
		description: draft.description
	});

	const [saved] = await db
		.insert(events)
		.values({
			userId: user.id,
			googleEventId: calendarEvent.id,
			title: draft.title,
			startAt: new Date(draft.startAt),
			endAt: new Date(draft.endAt),
			location: draft.location,
			description: draft.description
		})
		.returning();

	return json(saved);
};
