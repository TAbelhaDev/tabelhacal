// Lembretes proativos — ver ESCOPO.md/README "lembretes proativos (avisar
// antes do evento fazer sentido, não só na hora exata)". Disparado pelo
// handler `scheduled` (Cron Trigger) definido em worker/entry.js.
import { and, eq, gte, isNull, lte } from 'drizzle-orm';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { getDb } from '$lib/server/db';
import { events, pushSubscriptions, users } from '$lib/server/db/schema';

// Antecedência fixa do lembrete — sem configuração por evento/usuário na v1.
export const REMINDER_LEAD_TIME_MS = 30 * 60 * 1000;

export async function sendUpcomingEventReminders(env: Env): Promise<void> {
	const db = getDb(env.DB);
	const now = new Date();
	const windowEnd = new Date(now.getTime() + REMINDER_LEAD_TIME_MS);

	// Eventos que começam dentro da janela de antecedência e ainda não notificados.
	const upcoming = await db
		.select()
		.from(events)
		.where(
			and(isNull(events.reminderSentAt), gte(events.startAt, now), lte(events.startAt, windowEnd))
		);

	if (upcoming.length === 0) return;

	const vapid = {
		subject: env.VAPID_SUBJECT,
		publicKey: env.VAPID_PUBLIC_KEY,
		privateKey: env.VAPID_PRIVATE_KEY
	};

	for (const evt of upcoming) {
		const [user] = await db.select().from(users).where(eq(users.id, evt.userId));
		if (!user) {
			// Usuário não existe mais (ex: apagado) — marca como notificado pra
			// parar de reprocessar esse evento órfão a cada execução do cron.
			await db.update(events).set({ reminderSentAt: now }).where(eq(events.id, evt.id));
			continue;
		}

		const subscriptions = await db
			.select()
			.from(pushSubscriptions)
			.where(eq(pushSubscriptions.userId, evt.userId));

		if (subscriptions.length > 0) {
			const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
				hour: '2-digit',
				minute: '2-digit',
				timeZone: user.timezone
			});

			const message = {
				data: {
					title: evt.title,
					body: `Começa às ${timeFormatter.format(evt.startAt)}`,
					url: '/events'
				},
				options: { ttl: 1800 }
			};

			await Promise.all(
				subscriptions.map(async (sub) => {
					try {
						const payload = await buildPushPayload(
							message,
							{
								endpoint: sub.endpoint,
								expirationTime: null,
								keys: { p256dh: sub.p256dh, auth: sub.auth }
							},
							vapid
						);
						// cast: TS's lib.dom espera BodyInit/ArrayBuffer "não-compartilhado",
						// mas buildPushPayload devolve Uint8Array<ArrayBufferLike> — o valor
						// em si é compatível em runtime.
						const res = await fetch(sub.endpoint, payload as RequestInit);
						// 404/410 = subscription expirada/inválida no push service.
						if (res.status === 404 || res.status === 410) {
							await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
						}
					} catch (err) {
						console.error('[reminders] falha ao enviar push', sub.id, err);
					}
				})
			);
		}

		await db.update(events).set({ reminderSentAt: now }).where(eq(events.id, evt.id));
	}
}
