import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text('email').notNull().unique(),
	timezone: text('timezone').notNull().default('UTC'),
	// Array JSON de antecedências (em minutos) pros lembretes proativos, ex:
	// "[30,1440]" = avisa 30min e 1 dia antes. "[]" desativa lembretes mesmo
	// com push inscrito. Ver src/lib/server/push/reminders.ts.
	reminderOffsetsMinutes: text('reminder_offsets_minutes').notNull().default('[30]'),
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

// Histórico local de todo evento tocado pelo TAbelhaCal via chat (create/modify/
// delete/respond) — não só o que o app criou. `status` marca o que aconteceu;
// `delete` nunca remove a linha (é assim que o Histórico continua mostrando
// eventos apagados). Ver README "Histórico".
export const events = sqliteTable('events', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	calendarId: text('calendar_id').notNull().default('primary'),
	googleEventId: text('google_event_id').notNull(),
	title: text('title').notNull(),
	startAt: integer('start_at', { mode: 'timestamp' }).notNull(),
	endAt: integer('end_at', { mode: 'timestamp' }).notNull(),
	location: text('location'),
	description: text('description'),
	// 'active' | 'deleted'
	status: text('status').notNull().default('active'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	// Substituído por event_reminders (permite N lembretes por evento, cada um
	// com sua própria antecedência) — mantido só pra não precisar de uma
	// migration de "rename" no SQLite; não é mais lido/escrito pelo código.
	reminderSentAt: integer('reminder_sent_at', { mode: 'timestamp' })
});

// Uma linha por lembrete já disparado (evento, antecedência) — evita reenviar
// o mesmo lembrete a cada execução do cron. Ver src/lib/server/push/reminders.ts.
export const eventReminders = sqliteTable('event_reminders', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	eventId: text('event_id')
		.notNull()
		.references(() => events.id, { onDelete: 'cascade' }),
	offsetMinutes: integer('offset_minutes').notNull(),
	sentAt: integer('sent_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
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
