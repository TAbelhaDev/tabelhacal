<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { ToastType } from '$lib/enums/toast-type';
	import { pwaInfo } from 'virtual:pwa-info';
	import { toast } from 'svelte-sonner';
	import { getFlash } from 'sveltekit-flash-message';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	const flash = getFlash(page);

	$effect(() => {
		const f = $flash;
		if (!f) return;

		if (f.type === ToastType.success) {
			toast.success(f.message);
		} else if (f.type === ToastType.error) {
			toast.error(f.message);
		} else if (f.type === ToastType.info) {
			toast.info(f.message);
		} else if (f.type === ToastType.warning) {
			toast.warning(f.message);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="48x48" />
	<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- gerado pelo plugin (virtual:pwa-info), não é input do usuário -->
	{@html webManifestLink}
</svelte:head>
<ModeWatcher themeColors={{ dark: '#1e1e2e', light: '#eff1f5' }} />
<Toaster />
{#await import('$lib/ReloadPrompt.svelte') then { default: ReloadPrompt }}
	<ReloadPrompt />
{/await}
<div class="mx-auto flex min-h-svh w-full max-w-5xl flex-col border-x border-border">
	<AppHeader loggedIn={data.loggedIn} />
	<main class="flex flex-1 flex-col">
		{@render children()}
	</main>
</div>
