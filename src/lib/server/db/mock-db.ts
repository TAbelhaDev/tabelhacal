import type { getDb } from './index';
import { users, pushSubscriptions, googleOauthClients, googleTokens } from './schema';

type Db = ReturnType<typeof getDb>;

const TABLES = { users, pushSubscriptions, googleOauthClients, googleTokens } as const;

export interface MockDb {
	db: Db;
	setSelectResults(table: (typeof TABLES)[keyof typeof TABLES], rows: unknown[]): void;
	getInsertedValues(): unknown[];
	getConflictSets(): unknown[];
	getDeletedWheres(): unknown[];
}

export function createMockDb(): MockDb {
	const selectResults = new Map<object, unknown[]>();
	const insertedValues: unknown[] = [];
	const conflictSets: unknown[] = [];
	const deletedWheres: unknown[] = [];

	const db = {
		select: () => ({
			from: (table: object) => ({
				where: async () => selectResults.get(table) ?? []
			})
		}),
		insert: () => ({
			values: (values: unknown) => {
				insertedValues.push(values);
				return {
					onConflictDoUpdate: (opts: { set: unknown }) => {
						conflictSets.push(opts.set);
						return { returning: async () => [values] };
					},
					returning: async () => [values]
				};
			}
		}),
		delete: () => ({
			where: (pred: unknown) => {
				deletedWheres.push(pred);
				return { run: async () => {} };
			}
		})
	};

	return {
		db: db as unknown as Db,
		setSelectResults(table, rows) {
			selectResults.set(table, rows);
		},
		getInsertedValues: () => insertedValues,
		getConflictSets: () => conflictSets,
		getDeletedWheres: () => deletedWheres
	};
}
