import { eq } from 'drizzle-orm';
import type { getDb } from './index';
import { users } from './schema';

type Db = ReturnType<typeof getDb>;

export async function findUserByEmail(db: Db, email: string) {
	const [user] = await db.select().from(users).where(eq(users.email, email));
	return user ?? null;
}

export async function createUser(db: Db, email: string, timezone: string) {
	const [created] = await db.insert(users).values({ email, timezone }).returning();
	return created;
}
