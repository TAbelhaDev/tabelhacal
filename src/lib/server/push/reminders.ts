// Lembretes proativos — ver ESCOPO.md/README "lembretes proativos". Disparado
// pelo handler `scheduled` (Cron Trigger) definido em worker/entry.js.
import { and, eq, gte, lte } from 'drizzle-orm';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { getDb } from '$lib/server/db';
import { events, eventReminders, pushSubscriptions, users } from '$lib/server/db/schema';

export const DEFAULT_REMINDER_OFFSETS_MINUTES = [30];
export const MAX_REMINDER_OFFSETS = 5;
export const MIN_OFFSET_MINUTES = 1;
export const MAX_OFFSET_MINUTES = 60 * 24 * 14; // 2 semanas — limite de sanidade

// users.reminderOffsetsMinutes guarda um array JSON de antecedências em
// minutos (ex: "[30,1440]"). Array vazio = lembretes desativados pro usuário,
// mesmo com push inscrito. Qualquer valor inválido/corrompido cai no default.
export function parseReminderOffsets(raw: string): number[] {
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return DEFAULT_REMINDER_OFFSETS_MINUTES;
		const valid = parsed.filter(
			(n): n is number => Number.isInteger(n) && n >= MIN_OFFSET_MINUTES && n <= MAX_OFFSET_MINUTES
		);
		return valid.slice(0, MAX_REMINDER_OFFSETS);
	} catch {
		return DEFAULT_REMINDER_OFFSETS_MINUTES;
	}
}

export function serializeReminderOffsets(offsets: number[]): string {
	const unique = [...new Set(offsets)].sort((a, b) => a - b).slice(0, MAX_REMINDER_OFFSETS);
	return JSON.stringify(unique);
}

export function formatOffsetLabel(minutes: number): string {
	if (minutes < 60) return `${minutes} min`;
	if (minutes % (60 * 24) === 0) {
		const days = minutes / (60 * 24);
		return days === 1 ? '1 dia' : `${days} dias`;
	}
	if (minutes % 60 === 0) {
		const hours = minutes / 60;
		return hours === 1 ? '1 hora' : `${hours} horas`;
	}
	return `${minutes} min`;
}

export async function sendUpcomingEventReminders(env: Env): Promise<void> {
	const db = getDb(env.DB);
	const now = new Date();

	const vapid = {
		subject: env.VAPID_SUBJECT,
		publicKey: env.VAPID_PUBLIC_KEY,
		privateKey: env.VAPID_PRIVATE_KEY
	};

	const allUsers = await db.select().from(users);

	for (const user of allUsers) {
		const offsets = parseReminderOffsets(user.reminderOffsetsMinutes);
		if (offsets.length === 0) continue;

		const subscriptions = await db
			.select()
			.from(pushSubscriptions)
			.where(eq(pushSubscriptions.userId, user.id));
		if (subscriptions.length === 0) continue;

		const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: user.timezone
		});

		for (const offsetMinutes of offsets) {
			const windowEnd = new Date(now.getTime() + offsetMinutes * 60_000);

			const upcoming = await db
				.select()
				.from(events)
				.where(
					and(
						eq(events.userId, user.id),
						eq(events.status, 'active'),
						gte(events.startAt, now),
						lte(events.startAt, windowEnd)
					)
				);

			for (const evt of upcoming) {
				const [alreadySent] = await db
					.select()
					.from(eventReminders)
					.where(
						and(eq(eventReminders.eventId, evt.id), eq(eventReminders.offsetMinutes, offsetMinutes))
					);
				if (alreadySent) continue;

				const message = {
					data: {
						title: evt.title,
						body: `Começa em ${formatOffsetLabel(offsetMinutes)} (${timeFormatter.format(evt.startAt)})`,
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

				await db.insert(eventReminders).values({ eventId: evt.id, offsetMinutes });
			}
		}
	}
}
