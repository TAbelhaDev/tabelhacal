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

type EventRow = typeof events.$inferSelect;
type EventFields = {
	title: string;
	startAt: string;
	endAt: string;
	location: string | null;
	description: string | null;
};

// Upsert no cache/histórico local: qualquer evento tocado por um comando
// (create/modify/delete/respond) fica registrado, mesmo que não tenha sido
// criado pelo Gosplan. `delete` nunca remove a linha, só marca o status —
// ver README "Histórico".
async function upsertLocalEvent(
	db: ReturnType<typeof getDb>,
	userId: string,
	calendarId: string,
	googleEventId: string,
	fields: EventFields,
	status: 'active' | 'deleted'
): Promise<EventRow> {
	const [existing] = await db.select().from(events).where(eq(events.googleEventId, googleEventId));

	if (existing) {
		const [updated] = await db
			.update(events)
			.set({
				title: fields.title,
				startAt: new Date(fields.startAt),
				endAt: new Date(fields.endAt),
				location: fields.location,
				description: fields.description,
				status
			})
			.where(eq(events.id, existing.id))
			.returning();
		return updated;
	}

	const [inserted] = await db
		.insert(events)
		.values({
			userId,
			calendarId,
			googleEventId,
			title: fields.title,
			startAt: new Date(fields.startAt),
			endAt: new Date(fields.endAt),
			location: fields.location,
			description: fields.description,
			status
		})
		.returning();
	return inserted;
}

// Endpoint genérico de execução de comando (create/modify/delete/respond/list)
// — recebe o Command já confirmado pelo usuário no card do chat e aplica no
// Google Calendar + histórico local (D1). `list` não faz nenhuma mutação: os
// eventos já foram buscados durante o /api/parse, então só ecoamos de volta.
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

			const saved = await upsertLocalEvent(
				db,
				user.id,
				'primary',
				calendarEvent.id,
				{
					title: draft.title,
					startAt: draft.startAt,
					endAt: draft.endAt,
					location: draft.location,
					description: draft.description
				},
				'active'
			);

			return json({ type: 'create', event: saved });
		}

		case 'modify': {
			const { eventId, calendarId, scope, before, changes } = command;
			if (!eventId) error(400, 'Evento inválido.');
			// scope 'series' mira o evento "mestre" (recurringEventId), não a
			// ocorrência específica que a IA resolveu.
			const targetId =
				scope === 'series' && before?.recurringEventId ? before.recurringEventId : eventId;

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

			// Sem `before` (a IA não tinha o evento no contexto), não temos dados
			// completos o bastante pra registrar no histórico — só aplica no Google.
			let saved: EventRow | null = null;
			if (before) {
				saved = await upsertLocalEvent(
					db,
					user.id,
					calendarId,
					targetId,
					{
						title: changes.title ?? before.title,
						startAt: changes.startAt ?? before.startAt,
						endAt: changes.endAt ?? before.endAt,
						location: changes.location !== undefined ? changes.location : before.location,
						description:
							changes.description !== undefined ? changes.description : before.description
					},
					'active'
				);
			}

			return json({ type: 'modify', eventId: calendarEvent.id, event: saved });
		}

		case 'delete': {
			const { eventId, calendarId, scope, event: matched } = command;
			if (!eventId) error(400, 'Evento inválido.');
			const targetId =
				scope === 'series' && matched?.recurringEventId ? matched.recurringEventId : eventId;

			const accessToken = await getUserAccessToken(db, masterKey, locals.userId);
			await deleteCalendarEvent(accessToken, targetId, calendarId);

			// Sem o resumo do evento (a IA não tinha contexto), não há dados
			// completos pra registrar no histórico — só aplica no Google.
			if (matched) {
				await upsertLocalEvent(
					db,
					user.id,
					calendarId,
					targetId,
					{
						title: matched.title,
						startAt: matched.startAt,
						endAt: matched.endAt,
						location: matched.location,
						description: matched.description
					},
					'deleted'
				);
			}

			return json({ type: 'delete', eventId: targetId });
		}

		case 'respond': {
			const { eventId, calendarId, response, event: matched } = command;
			if (!eventId) error(400, 'Evento inválido.');

			const accessToken = await getUserAccessToken(db, masterKey, locals.userId);
			const calendarEvent = await respondToCalendarEvent(
				accessToken,
				calendarId,
				eventId,
				user.email,
				response
			);

			if (matched) {
				await upsertLocalEvent(
					db,
					user.id,
					calendarId,
					eventId,
					{
						title: matched.title,
						startAt: matched.startAt,
						endAt: matched.endAt,
						location: matched.location,
						description: matched.description
					},
					'active'
				);
			}

			return json({ type: 'respond', eventId: calendarEvent.id, response });
		}

		case 'list':
			return json({ type: 'list', events: command.events });

		case 'unresolved':
			error(400, command.message);
	}
};
