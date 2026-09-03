<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '@tabelhadev/tabelhawebui';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import ThemeToggle from './ThemeToggle.svelte';

	let { loggedIn = false }: { loggedIn?: boolean } = $props();

	const onboarding = $derived(page.url.pathname.startsWith('/onboarding'));
	const links = [
		{ href: resolve('/chat'), label: 'Chat' },
		{ href: resolve('/events'), label: 'Eventos' }
	] as const;
</script>

<header class="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-sm">
	<div class="flex h-14 items-center justify-between gap-4 px-6">
		<a href={resolve('/')} class="font-mono text-sm font-semibold tracking-tight">tabelhacal</a>

		{#if loggedIn}
			<nav class="flex gap-4">
				{#each links as link (link.href)}
					<a
						href={link.href}
						class="font-mono text-xs tracking-widest uppercase {page.url.pathname === link.href
							? 'text-foreground'
							: 'text-muted-foreground hover:text-foreground'}"
						aria-current={page.url.pathname === link.href ? 'page' : undefined}
					>
						{link.label}
					</a>
				{/each}
			</nav>
		{/if}

		<div class="flex items-center gap-2">
			<ThemeToggle />
			{#if loggedIn}
				<form method="POST" action={resolve('/logout')}>
					<Button type="submit" variant="ghost" size="sm">
						<LogOutIcon class="size-4" />
						<span class="hidden sm:inline">Sair</span>
					</Button>
				</form>
			{:else if !onboarding}
				<Button href={resolve('/onboarding/ai')} size="sm">Começar</Button>
			{/if}
		</div>
	</div>
</header>
