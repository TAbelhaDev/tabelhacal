<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, children }: { title: string; children?: Snippet } = $props();
</script>

<div class="overflow-hidden rounded-2xl border border-border">
	<div class="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
		<span class="size-2.5 rounded-full bg-ctp-red"></span>
		<span class="size-2.5 rounded-full bg-ctp-yellow"></span>
		<span class="size-2.5 rounded-full bg-ctp-green"></span>
		<span class="ml-2 font-mono text-xs text-muted-foreground">{title}</span>
	</div>
	<div class="p-4">
		{@render children?.()}
	</div>
</div>
