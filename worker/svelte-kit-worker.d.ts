// Declaração ambiente pro import de '../.svelte-kit/cloudflare/_worker.js' em
// entry.js. Esse arquivo só existe depois de `vite build` (é gerado pelo
// @sveltejs/adapter-cloudflare via wrangler.adapter.jsonc — ver comentário
// nesse arquivo e em entry.js), então `svelte-check` não consegue resolvê-lo
// quando rodado sem build prévio (fluxo normal de `bun run check`, que nem
// deveria depender de build output — ver gotcha documentado na validação
// deste projeto). Isso mantém o import tipado sem exigir o build.
// TS só consulta declarações de módulo ambíguas (fallback quando a resolução
// real falha) pra especificadores relativos quando o padrão tem wildcard —
// uma declaração exata (sem "*") é ignorada pra imports relativos.
declare module '*.svelte-kit/cloudflare/_worker.js' {
	const worker: {
		fetch: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>;
	};
	export default worker;
}
