import type { Handle } from '@sveltejs/kit';
import { getUserId } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.userId = await getUserId(event.platform!.env.SESSIONS, event.cookies);
	return resolve(event);
};
