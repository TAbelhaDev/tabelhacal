<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Badge } from '@tabeladev/tabelawebui';
	import PushSubscribe from '$lib/PushSubscribe.svelte';
	import ReminderSettings from '$lib/ReminderSettings.svelte';
	import { resolve } from '$app/paths';
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

<div class="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<p class="font-mono text-xs tracking-[0.2em] text-accent-ink uppercase">Histórico</p>
			<h1 class="font-mono text-2xl font-semibold tracking-tight">Seus eventos</h1>
		</div>
		<Button href={resolve('/chat')} variant="primary">Novo evento</Button>
	</div>

	<PushSubscribe vapidPublicKey={data.vapidPublicKey} />
	<ReminderSettings initialOffsetsMinutes={data.reminderOffsetsMinutes} />

	{#if data.events.length === 0}
		<div class="flex flex-col items-start gap-3 rounded-lg border border-border p-4">
			<p class="text-sm text-muted-foreground">Nenhum evento por aqui ainda.</p>
			<Button href={resolve('/chat')} variant="outline" size="sm">Criar o primeiro</Button>
		</div>
	{/if}

	{#each data.events as event (event.id)}
		<Card class={event.status === 'deleted' ? 'opacity-60' : ''}>
			<Card.Header>
				<Card.Title class="font-mono {event.status === 'deleted' ? 'line-through' : ''}"
					>{event.title}</Card.Title
				>
				<Card.Description class="flex items-center gap-2 font-mono text-xs">
					{formatRange(event.startAt, event.endAt)}
					{#if event.status === 'deleted'}
						<Badge variant="secondary" class="font-mono">Apagado</Badge>
					{/if}
				</Card.Description>
			</Card.Header>
			{#if event.location || event.description}
				<Card.Content class="flex flex-col gap-1 text-sm">
					{#if event.location}<p><strong>Local:</strong> {event.location}</p>{/if}
					{#if event.description}<p><strong>Descrição:</strong> {event.description}</p>{/if}
				</Card.Content>
			{/if}
			{#if event.status !== 'deleted'}
				<Card.Footer>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="eventId" value={event.id} />
						<Button type="submit" variant="outline">Excluir</Button>
					</form>
				</Card.Footer>
			{/if}
		</Card>
	{/each}
</div>
