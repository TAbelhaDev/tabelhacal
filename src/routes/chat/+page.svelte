<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';

	interface EventDraft {
		title: string;
		startAt: string;
		endAt: string;
		location: string | null;
		description: string | null;
	}

	let text = $state('');
	let draft = $state<EventDraft | null>(null);
	let parsing = $state(false);
	let confirming = $state(false);

	const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
		dateStyle: 'short',
		timeStyle: 'short'
	});

	function formatRange(startAt: string, endAt: string): string {
		return `${dateFormatter.format(new Date(startAt))} – ${dateFormatter.format(new Date(endAt))}`;
	}

	async function readErrorMessage(res: Response, fallback: string): Promise<string> {
		const body = (await res.json().catch(() => null)) as { message?: string } | null;
		return body?.message ?? fallback;
	}

	async function handleParse(e: SubmitEvent) {
		e.preventDefault();
		if (!text.trim()) return;

		parsing = true;
		draft = null;
		try {
			const res = await fetch('/api/parse', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ text })
			});
			if (!res.ok) throw new Error(await readErrorMessage(res, 'Falha ao interpretar o pedido.'));
			draft = await res.json();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Falha ao interpretar o pedido.');
		} finally {
			parsing = false;
		}
	}

	async function handleConfirm() {
		if (!draft) return;
		confirming = true;
		try {
			const res = await fetch('/api/events', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(draft)
			});
			if (!res.ok) throw new Error(await readErrorMessage(res, 'Falha ao criar o evento.'));
			toast.success('Evento criado no Google Calendar.');
			draft = null;
			text = '';
			await goto(resolve('/events'));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Falha ao criar o evento.');
		} finally {
			confirming = false;
		}
	}

	function handleCancel() {
		draft = null;
	}
</script>

<div class="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 p-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Gosplan</Card.Title>
			<Card.Description>Descreva o evento em linguagem natural.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleParse} class="flex gap-2">
				<Input
					bind:value={text}
					placeholder="ex: dentista quinta às 15h"
					disabled={parsing}
					class="flex-1"
				/>
				<Button type="submit" disabled={parsing || !text.trim()}>
					{parsing ? 'Interpretando...' : 'Enviar'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if draft}
		<Card.Root>
			<Card.Header>
				<Card.Title>{draft.title}</Card.Title>
				<Card.Description>{formatRange(draft.startAt, draft.endAt)}</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-1 text-sm">
				{#if draft.location}<p><strong>Local:</strong> {draft.location}</p>{/if}
				{#if draft.description}<p><strong>Descrição:</strong> {draft.description}</p>{/if}
			</Card.Content>
			<Card.Footer class="gap-2">
				<Button onclick={handleConfirm} disabled={confirming}>
					{confirming ? 'Criando...' : 'Confirmar'}
				</Button>
				<Button variant="outline" onclick={handleCancel} disabled={confirming}>Cancelar</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>
