import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { users, events } from '$lib/server/db/schema';
import { getUserAccessToken } from '$lib/server/google/tokens';
import {
	createCalendarEvent,
	updateCalendarEvent,
	deleteCalendarEvent,
	respondToCalendarEvent
} from '$lib/server/google/calendar';
import type { Command } from '$lib/server/ai/parse';

// Endpoint genérico de execução de comando (create/modify/delete/list) — recebe
// o Command já confirmado pelo usuário no card do chat e aplica no Google
// Calendar + cache local (D1). `list` não faz nenhuma mutação: os eventos já
// foram buscados durante o /api/parse, então só ecoamos de volta.
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.userId) error(401, 'Não autenticado.');

	const command = (await request.json()) as Command;

	const db = getDb(platform!.env.DB);
	const masterKey = platform!.env.MASTER_KEY;

	const [user] = await db.select().from(users).where(eq(users.id, locals.userId));
	if (!user) error(401, 'Usuário não encontrado.');

	switch (command.type) {
		case 'create': {
			const { draft } = command;
			if (!draft?.title || !draft.startAt || !draft.endAt) error(400, 'Evento incompleto.');

			const accessToken = await getUserAccessToken(db, masterKey, locals.userId);
			const calendarEvent = await createCalendarEvent(accessToken, {
				title: draft.title,
				startAt: draft.startAt,
				endAt: draft.endAt,
				timezone: user.timezone,
				location: draft.location,
				description: draft.description,
				recurrence: draft.recurrence
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

			return json({ type: 'create', event: saved });
		}

		case 'modify': {
			const { eventId, calendarId, scope, changes } = command;
			if (!eventId) error(400, 'Evento inválido.');
			// scope 'series' mira o evento "mestre" (recurringEventId), não a
			// ocorrência específica que a IA resolveu.
			const targetId =
				scope === 'series' && command.before?.recurringEventId
					? command.before.recurringEventId
					: eventId;

			const accessToken = await getUserAccessToken(db, masterKey, locals.userId);
			const calendarEvent = await updateCalendarEvent(
				accessToken,
				targetId,
				{
					title: changes.title,
					startAt: changes.startAt,
					endAt: changes.endAt,
					timezone: user.timezone,
					location: changes.location,
					description: changes.description
				},
				calendarId
			);

			// O evento pode ter sido criado fora do Gosplan (ou antes dele existir) —
			// nesse caso não há linha local pra atualizar, e tudo bem.
			const [existing] = await db.select().from(events).where(eq(events.googleEventId, targetId));
			let saved = existing ?? null;
			if (existing) {
				const patch: Partial<typeof events.$inferInsert> = {};
				if (changes.title !== undefined) patch.title = changes.title;
				if (changes.startAt !== undefined) patch.startAt = new Date(changes.startAt);
				if (changes.endAt !== undefined) patch.endAt = new Date(changes.endAt);
				if (changes.location !== undefined) patch.location = changes.location;
				if (changes.description !== undefined) patch.description = changes.description;

				if (Object.keys(patch).length > 0) {
					[saved] = await db
						.update(events)
						.set(patch)
						.where(eq(events.id, existing.id))
						.returning();
				}
			}

			return json({ type: 'modify', eventId: calendarEvent.id, event: saved });
		}

		case 'delete': {
			const { eventId, calendarId, scope } = command;
			if (!eventId) error(400, 'Evento inválido.');
			const targetId =
				scope === 'series' && command.event?.recurringEventId
					? command.event.recurringEventId
					: eventId;

			const accessToken = await getUserAccessToken(db, masterKey, locals.userId);
			await deleteCalendarEvent(accessToken, targetId, calendarId);

			// Mesma ressalva do modify: pode não existir linha local.
			const [existing] = await db.select().from(events).where(eq(events.googleEventId, targetId));
			if (existing) {
				await db.delete(events).where(eq(events.id, existing.id));
			}

			return json({ type: 'delete', eventId: targetId });
		}

		case 'respond': {
			const { eventId, calendarId, response } = command;
			if (!eventId) error(400, 'Evento inválido.');

			const accessToken = await getUserAccessToken(db, masterKey, locals.userId);
			const calendarEvent = await respondToCalendarEvent(
				accessToken,
				calendarId,
				eventId,
				user.email,
				response
			);

			return json({ type: 'respond', eventId: calendarEvent.id, response });
		}

		case 'list':
			return json({ type: 'list', events: command.events });

		case 'unresolved':
			error(400, command.message);
	}
};
