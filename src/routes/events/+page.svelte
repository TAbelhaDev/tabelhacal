<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
		dateStyle: 'short',
		timeStyle: 'short'
	});

	function formatRange(startAt: string | Date, endAt: string | Date): string {
		return `${dateFormatter.format(new Date(startAt))} – ${dateFormatter.format(new Date(endAt))}`;
	}
</script>

<div class="mx-auto flex min-h-svh max-w-lg flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold">Seus eventos</h1>
		<Button href="/chat">Novo evento</Button>
	</div>

	{#if data.events.length === 0}
		<p class="text-sm text-muted-foreground">Nenhum evento criado ainda.</p>
	{/if}

	{#each data.events as event (event.id)}
		<Card.Root>
			<Card.Header>
				<Card.Title>{event.title}</Card.Title>
				<Card.Description>{formatRange(event.startAt, event.endAt)}</Card.Description>
			</Card.Header>
			{#if event.location || event.description}
				<Card.Content class="flex flex-col gap-1 text-sm">
					{#if event.location}<p><strong>Local:</strong> {event.location}</p>{/if}
					{#if event.description}<p><strong>Descrição:</strong> {event.description}</p>{/if}
				</Card.Content>
			{/if}
			<Card.Footer>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="eventId" value={event.id} />
					<Button type="submit" variant="outline">Excluir</Button>
				</form>
			</Card.Footer>
		</Card.Root>
	{/each}
</div>
