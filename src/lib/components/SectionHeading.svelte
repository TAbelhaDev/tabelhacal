<script lang="ts">
	let { eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string } = $props();
</script>

<div class="flex flex-col gap-3">
	<p class="font-mono text-xs font-medium tracking-[0.2em] text-accent-ink uppercase">
		{eyebrow}
	</p>
	<h2 class="font-mono text-2xl font-semibold tracking-tight text-balance md:text-3xl">
		{title}
	</h2>
	{#if lead}
		<p class="text-muted-foreground md:max-w-xl">{lead}</p>
	{/if}
</div>
