import { describe, it, expect } from 'vitest';
import {
	upsertPushSubscription,
	findPushSubscriptionsByUserId,
	deletePushSubscriptionById
} from './push-subscriptions';
import { pushSubscriptions } from './schema';
import { createMockDb } from './mock-db';

const subscription = {
	userId: 'user-1',
	endpoint: 'https://push.example.com/sub-1',
	p256dh: 'p256dh-key',
	auth: 'auth-secret'
};

describe('upsertPushSubscription', () => {
	it('inserts the subscription and returns it', async () => {
		const { db, getInsertedValues } = createMockDb();

		const saved = await upsertPushSubscription(db, subscription);

		expect(saved).toEqual(subscription);
		expect(getInsertedValues()).toEqual([subscription]);
	});

	it('updates the owning user and keys on endpoint conflict (re-subscribe)', async () => {
		const { db, getConflictSets } = createMockDb();
		const reSub = { ...subscription, p256dh: 'new-p256dh' };

		await upsertPushSubscription(db, reSub);

		expect(getConflictSets()).toEqual([
			{ userId: 'user-1', p256dh: 'new-p256dh', auth: 'auth-secret' }
		]);
	});
});

describe('findPushSubscriptionsByUserId', () => {
	it('returns all subscriptions for the user', async () => {
		const { db, setSelectResults } = createMockDb();
		const rows = [{ id: 'sub-1', ...subscription }];
		setSelectResults(pushSubscriptions, rows);

		await expect(findPushSubscriptionsByUserId(db, 'user-1')).resolves.toEqual(rows);
	});

	it('returns an empty list when the user has no subscriptions', async () => {
		const { db } = createMockDb();

		await expect(findPushSubscriptionsByUserId(db, 'user-1')).resolves.toEqual([]);
	});
});

describe('deletePushSubscriptionById', () => {
	it('deletes the subscription by id', async () => {
		const { db, getDeletedWheres } = createMockDb();

		await deletePushSubscriptionById(db, 'sub-1');

		expect(getDeletedWheres()).toHaveLength(1);
	});
});
