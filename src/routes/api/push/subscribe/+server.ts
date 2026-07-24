import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { upsertPushSubscription } from '$lib/server/db/push-subscriptions';

interface SubscribePayload {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

function isSubscribePayload(value: unknown): value is SubscribePayload {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Partial<SubscribePayload>;
	return (
		typeof candidate.endpoint === 'string' &&
		typeof candidate.keys?.p256dh === 'string' &&
		typeof candidate.keys?.auth === 'string'
	);
}

// Recebe a PushSubscription criada no cliente via pushManager.subscribe() e
// guarda contra o usuário logado — ver src/lib/PushSubscribe.svelte.
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.userId) error(401, 'Não autenticado.');

	const payload = await request.json();
	if (!isSubscribePayload(payload)) error(400, 'Inscrição inválida.');

	const db = getDb(platform!.env.DB);
	await upsertPushSubscription(db, {
		userId: locals.userId,
		endpoint: payload.endpoint,
		p256dh: payload.keys.p256dh,
		auth: payload.keys.auth
	});

	return json({ success: true });
};
