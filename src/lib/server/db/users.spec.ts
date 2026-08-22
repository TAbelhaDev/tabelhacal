import { describe, it, expect } from 'vitest';
import { findUserByEmail, createUser } from './users';
import { users } from './schema';
import { createMockDb } from './mock-db';

describe('findUserByEmail', () => {
	it('returns null when no user matches', async () => {
		const { db } = createMockDb();

		await expect(findUserByEmail(db, 'nobody@example.com')).resolves.toBeNull();
	});

	it('returns the matching user', async () => {
		const { db, setSelectResults } = createMockDb();
		const user = { id: 'user-1', email: 'ian@example.com', timezone: 'America/Sao_Paulo' };
		setSelectResults(users, [user]);

		await expect(findUserByEmail(db, 'ian@example.com')).resolves.toEqual(user);
	});
});

describe('createUser', () => {
	it('inserts the user with the given email and timezone and returns it', async () => {
		const { db, getInsertedValues } = createMockDb();

		const created = await createUser(db, 'ian@example.com', 'America/Sao_Paulo');

		expect(created).toEqual({ email: 'ian@example.com', timezone: 'America/Sao_Paulo' });
		expect(getInsertedValues()).toEqual([
			{ email: 'ian@example.com', timezone: 'America/Sao_Paulo' }
		]);
	});
});
