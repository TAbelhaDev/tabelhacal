# Gosplan — Stack travada (doc atual, jul/2026)

> Versões e comandos a confirmar contra a documentação oficial na hora de
> instalar (`npm view <pkg> version` / `bun outdated`). Segue a mesma stack
> validada em `sigapp` (projeto irmão nesta pasta) — reaproveitar o que já foi
> confirmado lá.

## Visão geral

Um Worker central (Cloudflare) serve o frontend (PWA) e a API. Sem backend
separado — tudo no mesmo Worker.

| Camada          | Escolha                                               |
| --------------- | ----------------------------------------------------- |
| UI framework    | **SvelteKit** (Svelte 5 / runes)                      |
| UI kit          | **shadcn-svelte** + Tailwind v4                       |
| PWA             | `@vite-pwa/sveltekit`                                 |
| Deploy          | Cloudflare Workers (`@sveltejs/adapter-cloudflare`)   |
| DB              | **D1** (SQLite) via Drizzle ORM                       |
| Sessões         | **KV**                                                |
| Segredos        | Worker secret `MASTER_KEY` (AES-GCM/WebCrypto)        |
| IA (parse)      | BYOK — chave do usuário, tool use / structured output |
| Calendário      | Google Calendar API, BYO OAuth Client por usuário     |
| Package manager | Bun                                                   |

## Scaffold inicial

Mesma receita usada em `sigapp` (`sv` CLI cria tudo de uma vez):

```bash
bunx sv create . --template minimal --types ts \
  --add prettier eslint vitest="usages:unit" tailwindcss="plugins:none" \
  sveltekit-adapter="adapter:cloudflare+cfTarget:workers" \
  drizzle="database:d1" --install bun
```

Sem Better Auth aqui: o Gosplan **não tem cadastro tradicional de senha** —
identidade vem do fluxo Google OAuth (o próprio Client ID/Secret do usuário
autentica e identifica). Avaliar na implementação se ainda vale a pena usar
Better Auth só para gestão de sessão, ou se um cookie de sessão + KV simples
já resolve.

## Cloudflare Workers

- **Alvo**: Workers com Static Assets (não Pages — Pages está em manutenção).
- **Flag obrigatória**: `compatibility_flags: ["nodejs_compat"]` no
  `wrangler.jsonc` — necessária para libs de crypto/Node no `workerd`.
- Bindings via `platform.env`, tipados em `src/app.d.ts` a partir do `Env`
  gerado por `wrangler types`.
- `wrangler.jsonc` mínimo:

```jsonc
{
	"$schema": "./node_modules/wrangler/config-schema.json",
	"name": "gosplan",
	"main": ".svelte-kit/cloudflare/_worker.js",
	"compatibility_date": "2026-07-21",
	"compatibility_flags": ["nodejs_compat"],
	"assets": { "binding": "ASSETS", "directory": ".svelte-kit/cloudflare" },
	"d1_databases": [{ "binding": "DB", "database_name": "gosplan-db", "database_id": "<ID>" }],
	"kv_namespaces": [{ "binding": "SESSIONS", "id": "<ID>" }]
}
```

## UI — shadcn-svelte + Tailwind v4

- `bunx shadcn-svelte@latest init` → `add button card dialog input ...`
- Tailwind v4: `@tailwindcss/vite`, `@import "tailwindcss"` no CSS, cores
  OKLCH, `@theme inline`.
- Import: `import { Button } from "$lib/components/ui/button/index.js"`.

## DB — Drizzle + D1

- `bun add drizzle-orm` / `bun add -d drizzle-kit`.
- Schema com `drizzle-orm/sqlite-core`, instância via `drizzle(env.DB)`
  (`drizzle-orm/d1`).
- Fluxo de migration: `bunx drizzle-kit generate` (emite SQL) →
  `bunx wrangler d1 migrations apply gosplan-db --local|--remote`.

## PWA

- `@vite-pwa/sveltekit`, `strategies: 'generateSW'`, `registerType: 'prompt'`.
- `kit.serviceWorker.register: false` no `svelte.config.js` (SW não-nativo).
- `NetworkOnly` para `/api`, `/auth` — nunca cachear escrita/auth.
- Manifest: ícones 192+512 PNG (+ maskable) e `apple-touch-icon` 180×180.

## Google Calendar — fluxo BYO OAuth Client

Ver `ESCOPO.md` seção 2.3 para o racional. Pontos técnicos:

- **Redirect URI fixo**: `https://<domínio do Gosplan>/auth/google/callback` —
  é o mesmo endpoint pra todos os usuários; cada um cola esse valor exato como
  "Authorized redirect URI" no próprio GCP Console ao criar o Client ID.
- O Worker guarda, por usuário: `client_id`, `client_secret` (criptografados em
  D1) e depois o `refresh_token` obtido (também criptografado).
- Fluxo de autorização (`/auth/google/start?user=...`): monta a URL de
  `accounts.google.com/o/oauth2/v2/auth` usando o `client_id` **daquele
  usuário**, scope `https://www.googleapis.com/auth/calendar.events`.
- Callback (`/auth/google/callback`): troca o `code` por tokens usando
  `client_id`+`client_secret` do usuário → salva `refresh_token` criptografado.
- Chamadas subsequentes à Calendar API usam o `access_token` renovado via
  `refresh_token` + credenciais do próprio usuário.

## IA — BYOK

- Usuário cola a própria API key + escolhe o modelo (dropdown com os modelos
  suportados pelo provider escolhido).
- Endpoint `/parse`: decripta a key do usuário → chama o provider com tool
  use / structured output, passando data atual + timezone do usuário → retorna
  JSON do evento para o card de confirmação.
- IA nunca cria o evento diretamente — só estrutura o JSON.

## Papel do Bun

- Package manager + runner de dev/build (`bun install`, `bun run dev`,
  `bunx wrangler`, `bunx drizzle-kit`).
- **Não é o runtime de produção** — produção roda em `workerd`. Não usar
  `Bun.*` em código que vai pro Worker.
