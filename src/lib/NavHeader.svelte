<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';

	const links = [
		{ href: resolve('/chat'), label: 'Chat' },
		{ href: resolve('/events'), label: 'Eventos' }
	] as const;
</script>

<div class="flex items-center justify-between text-sm">
	<nav class="flex gap-4 font-medium">
		{#each links as link (link.href)}
			<a
				href={link.href}
				class="hover:underline"
				aria-current={page.url.pathname === link.href ? 'page' : undefined}
			>
				{link.label}
			</a>
		{/each}
	</nav>
	<form method="POST" action={resolve('/logout')}>
		<Button type="submit" variant="ghost" size="sm">Sair</Button>
	</form>
</div>
