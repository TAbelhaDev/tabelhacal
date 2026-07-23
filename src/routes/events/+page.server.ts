import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { getUserAccessToken } from '$lib/server/google/tokens';
import { deleteCalendarEvent } from '$lib/server/google/calendar';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.userId) redirect(303, '/onboarding/ai');

	const db = getDb(platform!.env.DB);
	const userEvents = await db
		.select()
		.from(events)
		.where(eq(events.userId, locals.userId))
		.orderBy(desc(events.startAt));

	return { events: userEvents };
};

export const actions: Actions = {
	delete: async ({ request, locals, platform }) => {
		if (!locals.userId) error(401, 'Não autenticado.');

		const form = await request.formData();
		const eventId = form.get('eventId');
		if (typeof eventId !== 'string') error(400, 'Evento inválido.');

		const db = getDb(platform!.env.DB);
		const [existing] = await db.select().from(events).where(eq(events.id, eventId));
		if (!existing || existing.userId !== locals.userId) error(404, 'Evento não encontrado.');

		const accessToken = await getUserAccessToken(db, platform!.env.MASTER_KEY, locals.userId);
		await deleteCalendarEvent(accessToken, existing.googleEventId);
		await db.delete(events).where(eq(events.id, eventId));

		return { success: true };
	}
};
