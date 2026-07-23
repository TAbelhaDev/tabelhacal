<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ToastType } from '$lib/enums/toast-type';
	import { pwaInfo } from 'virtual:pwa-info';
	import { toast } from 'svelte-sonner';
	import { getFlash } from 'sveltekit-flash-message';

	let { children } = $props();

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
<Toaster />
{#await import('$lib/ReloadPrompt.svelte') then { default: ReloadPrompt }}
	<ReloadPrompt />
{/await}
{@render children()}
