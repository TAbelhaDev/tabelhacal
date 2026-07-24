import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	timezone: text('timezone').notNull().default('UTC'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// BYOK de IA — ver ESCOPO.md §2.2
export const aiCredentials = sqliteTable('ai_credentials', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull(),
	model: text('model').notNull(),
	keyEncrypted: text('key_encrypted').notNull(),
	nonce: text('nonce').notNull()
});

// Client ID/Secret do próprio GCP do usuário — ver ESCOPO.md §2.3.
// Nonce separado por segredo: AES-GCM quebra a confidencialidade se o mesmo
// nonce for reusado com a mesma chave pra cifrar dois textos diferentes.
export const googleOauthClients = sqliteTable('google_oauth_clients', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	clientIdEncrypted: text('client_id_encrypted').notNull(),
	clientIdNonce: text('client_id_nonce').notNull(),
	clientSecretEncrypted: text('client_secret_encrypted').notNull(),
	clientSecretNonce: text('client_secret_nonce').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Refresh token obtido via OAuth usando o client acima
export const googleTokens = sqliteTable('google_tokens', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
	nonce: text('nonce').notNull(),
	scope: text('scope').notNull(),
	expiry: integer('expiry', { mode: 'timestamp' })
});

// Eventos criados pelo app — cache/histórico local
export const events = sqliteTable('events', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	googleEventId: text('google_event_id').notNull(),
	title: text('title').notNull(),
	startAt: integer('start_at', { mode: 'timestamp' }).notNull(),
	endAt: integer('end_at', { mode: 'timestamp' }).notNull(),
	location: text('location'),
	description: text('description'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	// Marca quando o lembrete proativo (push, ~30min antes de startAt) foi
	// disparado — null = ainda não notificado. Ver ESCOPO.md "lembretes proativos"
	// e src/lib/server/push/reminders.ts.
	reminderSentAt: integer('reminder_sent_at', { mode: 'timestamp' })
});

// Inscrições de Web Push (PushManager.subscribe()) — uma por dispositivo/navegador
// do usuário. endpoint é único pois cada subscription do browser aponta pra uma
// URL própria do push service (FCM, Mozilla autopush etc).
export const pushSubscriptions = sqliteTable('push_subscriptions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull().unique(),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});
