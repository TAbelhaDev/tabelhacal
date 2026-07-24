import { eq } from 'drizzle-orm';
import type { getDb } from './index';
import { pushSubscriptions } from './schema';

type Db = ReturnType<typeof getDb>;

export interface PushSubscriptionInput {
	userId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
}

// endpoint é único por dispositivo/navegador — re-inscrever (ex: permissão
// resetada e concedida de novo) atualiza a subscription existente em vez de
// duplicar.
export async function upsertPushSubscription(db: Db, input: PushSubscriptionInput) {
	const [saved] = await db
		.insert(pushSubscriptions)
		.values(input)
		.onConflictDoUpdate({
			target: pushSubscriptions.endpoint,
			set: { userId: input.userId, p256dh: input.p256dh, auth: input.auth }
		})
		.returning();
	return saved;
}

export async function findPushSubscriptionsByUserId(db: Db, userId: string) {
	return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function deletePushSubscriptionById(db: Db, id: string) {
	await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
}
