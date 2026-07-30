import { defineConfig } from 'drizzle-kit';

// Fluxo D1: `drizzle-kit generate` só emite o SQL em ./drizzle;
// quem aplica é o wrangler (`wrangler d1 migrations apply ndrc-db --local|--remote`).
// Por isso não há `driver` nem credenciais aqui.
export default defineConfig({
	out: './drizzle',
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	verbose: true,
	strict: true
});
