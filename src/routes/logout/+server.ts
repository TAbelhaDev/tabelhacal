import { redirect } from 'sveltekit-flash-message/server';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/session';
import { ToastType } from '$lib/enums/toast-type';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	await destroySession(platform!.env.SESSIONS, cookies);
	redirect(
		'/onboarding/ai',
		{ type: ToastType.success, message: 'Você saiu da sua conta.' },
		cookies
	);
};
