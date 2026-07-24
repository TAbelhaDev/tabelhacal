/// <reference path="./svelte-kit-worker.d.ts" />
// Wrapper em torno do worker gerado pelo @sveltejs/adapter-cloudflare.
//
// A versão instalada do adapter (@sveltejs/adapter-cloudflare@^7) só gera um
// `_worker.js` com `export default { fetch }` — não há extensão documentada
// pra adicionar outros handlers (scheduled, queue, etc), ver
// https://github.com/sveltejs/kit/issues/13692. O padrão usado aqui (e por
// forks/discussões da comunidade, ex. joshuadavidthomas/sveltekit-adapter-cloudflare)
// é apontar `wrangler.jsonc`'s `main` pra um pequeno arquivo próprio que
// reexporta o `fetch` do worker gerado pelo SvelteKit e adiciona `scheduled`
// por cima.
//
// O adapter é configurado (vite.config.ts: adapter({ config:
// 'wrangler.adapter.jsonc' })) pra ler uma config *separada* da wrangler.jsonc
// real, só pra continuar escrevendo o worker gerado no local default
// (.svelte-kit/cloudflare/_worker.js) em vez de sobrescrever este arquivo —
// ver comentário em wrangler.adapter.jsonc.
//
// Fica fora de `src/` de propósito: se ficasse dentro, o `svelte-check` (rodado
// por `bun run check`) type-checaria transitivamente o `_worker.js` gerado (um
// bundle Rollup grande e não tipado) — é exatamente o gotcha já documentado
// pra este projeto (ver instruções de validação / CLAUDE.md do job).
//
// `$lib` funciona aqui porque `wrangler.jsonc` declara `alias: { "$lib":
// "./src/lib" }`, resolvido pelo esbuild do wrangler (mesma ideia do alias do
// Vite, só que pro bundle que o wrangler gera a partir deste `main`).
import server from '../.svelte-kit/cloudflare/_worker.js';
import { sendUpcomingEventReminders } from '$lib/server/push/reminders';

export default {
	fetch: server.fetch,
	/**
	 * @param {ScheduledController} _event
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 */
	async scheduled(_event, env, ctx) {
		ctx.waitUntil(sendUpcomingEventReminders(env));
	}
};
