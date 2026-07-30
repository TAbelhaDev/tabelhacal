import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// config: 'wrangler.adapter.jsonc' — não a wrangler.jsonc real. Ver
			// comentário nesse arquivo: evita que o adapter sobrescreva
			// worker/entry.js (o wrapper que adiciona o handler `scheduled`).
			adapter: adapter({ config: 'wrangler.adapter.jsonc' }),
			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			}
		}),
		SvelteKitPWA({
			strategies: 'generateSW',
			registerType: 'prompt',
			manifest: {
				name: 'TabelaCal',
				short_name: 'TabelaCal',
				description: 'Agenda com IA — fale e o TabelaCal cria o evento no seu Google Calendar.',
				theme_color: '#18181b',
				background_color: '#18181b',
				display: 'standalone',
				start_url: '/',
				icons: [
					{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
					{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
					{
						src: 'maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				// /api e /auth nunca devem ser servidos do cache (sessão/BYOK por request).
				runtimeCaching: [
					{
						urlPattern: ({ url }) =>
							url.pathname.startsWith('/api') || url.pathname.startsWith('/auth'),
						handler: 'NetworkOnly'
					}
				],
				// generateSW não permite código custom direto no SW gerado, mas
				// aceita importScripts — usado aqui pro listener de `push`
				// (lembretes proativos, ver static/sw-push.js e
				// src/lib/server/push/reminders.ts). Trocar pra `injectManifest`
				// não foi necessário.
				importScripts: ['sw-push.js']
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
