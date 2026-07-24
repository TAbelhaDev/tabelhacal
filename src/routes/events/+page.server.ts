import { error, redirect } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import type { Actions, PageServerLoad } from './$types';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { events, users } from '$lib/server/db/schema';
import { getUserAccessToken } from '$lib/server/google/tokens';
import { deleteCalendarEvent } from '$lib/server/google/calendar';
import { ToastType } from '$lib/enums/toast-type';
import { parseReminderOffsets } from '$lib/server/push/reminders';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.userId) redirect(303, '/onboarding/ai');

	const db = getDb(platform!.env.DB);
	const userEvents = await db
		.select()
		.from(events)
		.where(eq(events.userId, locals.userId))
		.orderBy(desc(events.startAt));

	const [user] = await db.select().from(users).where(eq(users.id, locals.userId));

	return {
		events: userEvents,
		// Chave pública VAPID — não é segredo, precisa ir pro client pra
		// pushManager.subscribe(). Ver src/lib/PushSubscribe.svelte.
		vapidPublicKey: platform!.env.VAPID_PUBLIC_KEY,
		reminderOffsetsMinutes: parseReminderOffsets(user?.reminderOffsetsMinutes ?? '[]')
	};
};

export const actions: Actions = {
	delete: async (event) => {
		const { request, locals, platform, cookies } = event;
		if (!locals.userId) error(401, 'Não autenticado.');

		const form = await request.formData();
		const eventId = form.get('eventId');
		if (typeof eventId !== 'string') error(400, 'Evento inválido.');

		const db = getDb(platform!.env.DB);
		const [existing] = await db.select().from(events).where(eq(events.id, eventId));
		if (!existing || existing.userId !== locals.userId) error(404, 'Evento não encontrado.');

		try {
			const accessToken = await getUserAccessToken(db, platform!.env.MASTER_KEY, locals.userId);
			await deleteCalendarEvent(accessToken, existing.googleEventId, existing.calendarId);
			// Não remove a linha — o Histórico continua mostrando o evento,
			// marcado como apagado. Ver README "Histórico".
			await db.update(events).set({ status: 'deleted' }).where(eq(events.id, eventId));
		} catch {
			setFlash(
				{ type: ToastType.error, message: 'Falha ao excluir o evento. Tente novamente.' },
				cookies
			);
			return { success: false };
		}

		setFlash({ type: ToastType.success, message: 'Evento excluído.' }, cookies);
		return { success: true };
	}
};
