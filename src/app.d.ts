/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/info" />

import type { ToastType } from '$lib/enums/toast-type';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface Error {}
		interface Locals {
			userId: string | null;
		}
		interface PageData {
			flash?: { type: ToastType; message: string };
		}
		// interface PageState {}
	}
}

export {};
