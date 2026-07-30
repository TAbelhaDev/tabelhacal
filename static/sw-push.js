// Handler de `push`/`notificationclick` pro service worker gerado pelo
// @vite-pwa/sveltekit (strategies: 'generateSW' — Workbox). generateSW não
// aceita código custom direto no arquivo do SW, mas o workbox-build suporta
// `importScripts`, que insere `importScripts(...)` no topo do sw.js gerado —
// ver `workbox.importScripts` em vite.config.ts. Esse arquivo precisa ficar em
// `static/` (raiz do build) já que importScripts() só aceita URLs relativas
// à origem do próprio service worker.
//
// Ver src/lib/server/push/reminders.ts pro formato do payload enviado
// (`{ title, body, url }`, serializado como JSON pelo buildPushPayload).
self.addEventListener('push', (event) => {
	let payload = {};
	if (event.data) {
		try {
			payload = event.data.json();
		} catch {
			payload = { body: event.data.text() };
		}
	}

	const title = payload.title || 'NDRC';
	const url = payload.url || '/events';

	event.waitUntil(
		self.registration.showNotification(title, {
			body: payload.body || '',
			icon: '/pwa-192x192.png',
			badge: '/pwa-64x64.png',
			data: { url }
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification.data?.url || '/events';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
			const existing = clientsList.find((client) => client.url.includes(url));
			if (existing) return existing.focus();
			return self.clients.openWindow(url);
		})
	);
});
