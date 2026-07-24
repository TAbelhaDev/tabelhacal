import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import {
	serializeReminderOffsets,
	MAX_REMINDER_OFFSETS,
	MIN_OFFSET_MINUTES,
	MAX_OFFSET_MINUTES
} from '$lib/server/push/reminders';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.userId) error(401, 'Não autenticado.');

	const { offsetsMinutes } = (await request.json()) as { offsetsMinutes?: unknown };
	if (!Array.isArray(offsetsMinutes)) error(400, 'Formato inválido.');

	if (offsetsMinutes.length > MAX_REMINDER_OFFSETS) {
		error(400, `No máximo ${MAX_REMINDER_OFFSETS} lembretes por evento.`);
	}
	const valid = offsetsMinutes.every(
		(n) => Number.isInteger(n) && n >= MIN_OFFSET_MINUTES && n <= MAX_OFFSET_MINUTES
	);
	if (!valid) error(400, 'Antecedência inválida.');

	const db = getDb(platform!.env.DB);
	await db
		.update(users)
		.set({ reminderOffsetsMinutes: serializeReminderOffsets(offsetsMinutes as number[]) })
		.where(eq(users.id, locals.userId));

	return json({ success: true });
};
