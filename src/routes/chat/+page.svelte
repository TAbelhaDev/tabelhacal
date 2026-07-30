<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import NavHeader from '$lib/NavHeader.svelte';

	interface EventDraft {
		title: string;
		startAt: string;
		endAt: string;
		location: string | null;
		description: string | null;
		recurrence: string[] | null;
		calendarId: string | null;
	}

	interface CalendarEventSummary {
		id: string;
		calendarId: string;
		recurringEventId: string | null;
		title: string;
		startAt: string;
		endAt: string;
		location: string | null;
		description: string | null;
	}

	type RecurrenceScope = 'instance' | 'series';

	// Mesmo shape discriminado de src/lib/server/ai/parse.ts — duplicado aqui de
	// propósito (convenção já usada neste arquivo pro EventDraft): código de
	// $lib/server não pode ser importado em código de cliente.
	type Command =
		| { type: 'create'; draft: EventDraft }
		| {
				type: 'modify';
				eventId: string;
				calendarId: string;
				scope: RecurrenceScope;
				before: CalendarEventSummary | null;
				changes: Partial<EventDraft>;
		  }
		| {
				type: 'delete';
				eventId: string;
				calendarId: string;
				scope: RecurrenceScope;
				event: CalendarEventSummary | null;
		  }
		| {
				type: 'respond';
				eventId: string;
				calendarId: string;
				response: 'accepted' | 'declined' | 'tentative';
				event: CalendarEventSummary | null;
		  }
		| { type: 'list'; events: CalendarEventSummary[] }
		| { type: 'unresolved'; message: string };

	type PendingCommand = Extract<Command, { type: 'create' | 'modify' | 'delete' | 'respond' }>;

	let text = $state('');
	let command = $state<Command | null>(null);
	let parsing = $state(false);
	let confirming = $state(false);

	const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
		dateStyle: 'short',
		timeStyle: 'short'
	});

	function formatRange(startAt: string, endAt: string): string {
		return `${dateFormatter.format(new Date(startAt))} – ${dateFormatter.format(new Date(endAt))}`;
	}

	interface DiffRow {
		label: string;
		before: string;
		after: string;
	}

	function diffRows(cmd: Extract<Command, { type: 'modify' }>): DiffRow[] {
		const rows: DiffRow[] = [];
		const before = cmd.before;

		if (cmd.changes.title !== undefined) {
			rows.push({ label: 'Título', before: before?.title ?? '—', after: cmd.changes.title });
		}
		if (cmd.changes.startAt !== undefined || cmd.changes.endAt !== undefined) {
			const beforeRange = before ? formatRange(before.startAt, before.endAt) : '—';
			const afterStart = cmd.changes.startAt ?? before?.startAt;
			const afterEnd = cmd.changes.endAt ?? before?.endAt;
			const afterRange = afterStart && afterEnd ? formatRange(afterStart, afterEnd) : '—';
			rows.push({ label: 'Data', before: beforeRange, after: afterRange });
		}
		if (cmd.changes.location !== undefined) {
			rows.push({
				label: 'Local',
				before: before?.location ?? '—',
				after: cmd.changes.location ?? '—'
			});
		}
		if (cmd.changes.description !== undefined) {
			rows.push({
				label: 'Descrição',
				before: before?.description ?? '—',
				after: cmd.changes.description ?? '—'
			});
		}
		return rows;
	}

	function confirmLabel(type: PendingCommand['type'], busy: boolean): string {
		if (type === 'create') return busy ? 'Criando...' : 'Confirmar';
		if (type === 'modify') return busy ? 'Salvando...' : 'Confirmar';
		if (type === 'respond') return busy ? 'Enviando...' : 'Confirmar';
		return busy ? 'Excluindo...' : 'Confirmar';
	}

	function successMessage(type: PendingCommand['type']): string {
		if (type === 'create') return 'Evento criado no Google Calendar.';
		if (type === 'modify') return 'Evento atualizado no Google Calendar.';
		if (type === 'respond') return 'Resposta enviada ao convite.';
		return 'Evento excluído do Google Calendar.';
	}

	function responseLabel(response: 'accepted' | 'declined' | 'tentative'): string {
		if (response === 'accepted') return 'Aceitar';
		if (response === 'declined') return 'Recusar';
		return 'Talvez';
	}

	async function readErrorMessage(res: Response, fallback: string): Promise<string> {
		const body = (await res.json().catch(() => null)) as { message?: string } | null;
		return body?.message ?? fallback;
	}

	async function handleParse(e: SubmitEvent) {
		e.preventDefault();
		if (!text.trim()) return;

		parsing = true;
		command = null;
		try {
			const res = await fetch('/api/parse', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ text })
			});
			if (!res.ok) throw new Error(await readErrorMessage(res, 'Falha ao interpretar o pedido.'));

			const result = (await res.json()) as Command;

			if (result.type === 'unresolved') {
				toast.error(result.message);
				return;
			}

			command = result;
			if (result.type === 'list') {
				text = '';
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Falha ao interpretar o pedido.');
		} finally {
			parsing = false;
		}
	}

	async function handleConfirm() {
		if (!command || command.type === 'list' || command.type === 'unresolved') return;
		const pending = command;

		confirming = true;
		try {
			const res = await fetch('/api/commands', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(pending)
			});
			if (!res.ok) throw new Error(await readErrorMessage(res, 'Falha ao executar o comando.'));

			toast.success(successMessage(pending.type));
			command = null;
			text = '';
			await goto(resolve('/events'));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Falha ao executar o comando.');
		} finally {
			confirming = false;
		}
	}

	function handleCancel() {
		command = null;
	}
</script>

<div class="mx-auto flex min-h-svh max-w-lg flex-col gap-6 p-6">
	<NavHeader />
	<Card.Root>
		<Card.Header>
			<Card.Title>TabelaCal</Card.Title>
			<Card.Description
				>Diga o que quer fazer no seu calendário, em linguagem natural.</Card.Description
			>
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

	{#if command?.type === 'create'}
		<Card.Root>
			<Card.Header>
				<Card.Title>{command.draft.title}</Card.Title>
				<Card.Description
					>{formatRange(command.draft.startAt, command.draft.endAt)}</Card.Description
				>
			</Card.Header>
			<Card.Content class="flex flex-col gap-1 text-sm">
				{#if command.draft.location}<p><strong>Local:</strong> {command.draft.location}</p>{/if}
				{#if command.draft.description}<p>
						<strong>Descrição:</strong>
						{command.draft.description}
					</p>{/if}
				{#if command.draft.recurrence}<p>
						<strong>Repete:</strong>
						{command.draft.recurrence.join(', ')}
					</p>{/if}
				{#if command.draft.calendarId}<p>
						<strong>Agenda:</strong>
						{command.draft.calendarId}
					</p>{/if}
			</Card.Content>
			<Card.Footer class="gap-2">
				<Button onclick={handleConfirm} disabled={confirming}>
					{confirmLabel('create', confirming)}
				</Button>
				<Button variant="outline" onclick={handleCancel} disabled={confirming}>Cancelar</Button>
			</Card.Footer>
		</Card.Root>
	{:else if command?.type === 'modify'}
		<Card.Root>
			<Card.Header>
				<Card.Title>{command.before?.title ?? 'Modificar evento'}</Card.Title>
				<Card.Description>Confira as alterações antes de confirmar.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-2 text-sm">
				{#each diffRows(command) as row (row.label)}
					<p><strong>{row.label}:</strong> {row.before} → {row.after}</p>
				{/each}
			</Card.Content>
			<Card.Footer class="gap-2">
				<Button onclick={handleConfirm} disabled={confirming}>
					{confirmLabel('modify', confirming)}
				</Button>
				<Button variant="outline" onclick={handleCancel} disabled={confirming}>Cancelar</Button>
			</Card.Footer>
		</Card.Root>
	{:else if command?.type === 'delete'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Apagar “{command.event?.title ?? command.eventId}”?</Card.Title>
				{#if command.event}
					<Card.Description
						>{formatRange(command.event.startAt, command.event.endAt)}</Card.Description
					>
				{/if}
			</Card.Header>
			<Card.Footer class="gap-2">
				<Button variant="destructive" onclick={handleConfirm} disabled={confirming}>
					{confirmLabel('delete', confirming)}
				</Button>
				<Button variant="outline" onclick={handleCancel} disabled={confirming}>Cancelar</Button>
			</Card.Footer>
		</Card.Root>
	{:else if command?.type === 'respond'}
		<Card.Root>
			<Card.Header>
				<Card.Title>{command.event?.title ?? 'Responder convite'}</Card.Title>
				<Card.Description>
					{responseLabel(command.response)}
					{#if command.event}
						— {formatRange(command.event.startAt, command.event.endAt)}
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Footer class="gap-2">
				<Button onclick={handleConfirm} disabled={confirming}>
					{confirmLabel('respond', confirming)}
				</Button>
				<Button variant="outline" onclick={handleCancel} disabled={confirming}>Cancelar</Button>
			</Card.Footer>
		</Card.Root>
	{:else if command?.type === 'list'}
		{#if command.events.length === 0}
			<p class="text-sm text-muted-foreground">Nenhum evento encontrado nos próximos 30 dias.</p>
		{/if}
		{#each command.events as event (event.id)}
			<Card.Root>
				<Card.Header>
					<Card.Title>{event.title}</Card.Title>
					<Card.Description>{formatRange(event.startAt, event.endAt)}</Card.Description>
				</Card.Header>
				{#if event.location}
					<Card.Content class="text-sm">
						<p><strong>Local:</strong> {event.location}</p>
					</Card.Content>
				{/if}
			</Card.Root>
		{/each}
	{/if}
</div>
