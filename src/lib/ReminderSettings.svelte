<script lang="ts">
	// Configuração de lembretes proativos (quantos, com quanta antecedência cada
	// um) — ver README "Lembretes proativos" e src/lib/server/push/reminders.ts.
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';

	let { initialOffsetsMinutes }: { initialOffsetsMinutes: number[] } = $props();

	const UNIT_MINUTES: Record<string, number> = { minutos: 1, horas: 60, dias: 60 * 24 };
	const UNIT_LABELS: Record<string, string> = { minutos: 'minutos', horas: 'horas', dias: 'dias' };

	// Só usa o valor inicial da prop pra "semear" o estado local — depois disso
	// `offsets` é gerenciado só pelas ações do próprio componente (add/remove).
	let offsets = $state(untrack(() => [...initialOffsetsMinutes].sort((a, b) => a - b)));
	let newValue = $state('30');
	let newUnit = $state<'minutos' | 'horas' | 'dias'>('minutos');
	let saving = $state(false);

	function formatOffset(minutes: number): string {
		if (minutes % (60 * 24) === 0 && minutes >= 60 * 24) return `${minutes / (60 * 24)} dia(s)`;
		if (minutes % 60 === 0 && minutes >= 60) return `${minutes / 60} hora(s)`;
		return `${minutes} min`;
	}

	async function save(next: number[]) {
		saving = true;
		try {
			const res = await fetch('/api/reminders', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ offsetsMinutes: next })
			});
			if (!res.ok) throw new Error('failed');
			offsets = next;
			toast.success('Lembretes atualizados.');
		} catch {
			toast.error('Não foi possível salvar. Tente novamente.');
		} finally {
			saving = false;
		}
	}

	function addOffset() {
		const amount = Number(newValue);
		if (!Number.isInteger(amount) || amount <= 0) {
			toast.error('Informe um número inteiro maior que zero.');
			return;
		}
		const minutes = amount * UNIT_MINUTES[newUnit];
		if (offsets.includes(minutes)) return;
		if (offsets.length >= 5) {
			toast.error('Máximo de 5 lembretes por evento.');
			return;
		}
		save([...offsets, minutes].sort((a, b) => a - b));
	}

	function removeOffset(minutes: number) {
		save(offsets.filter((m) => m !== minutes));
	}
</script>

<div class="flex flex-col gap-2 rounded-lg border p-3 text-sm">
	<p class="font-medium">Lembretes por evento</p>
	{#if offsets.length === 0}
		<p class="text-muted-foreground">Nenhum lembrete configurado.</p>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each offsets as minutes (minutes)}
				<Badge variant="secondary" class="gap-1.5 py-1">
					{formatOffset(minutes)} antes
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground"
						disabled={saving}
						onclick={() => removeOffset(minutes)}
						aria-label={`Remover lembrete de ${formatOffset(minutes)} antes`}
					>
						×
					</button>
				</Badge>
			{/each}
		</div>
	{/if}

	<div class="flex items-center gap-2">
		<Input type="number" min="1" bind:value={newValue} class="w-20" disabled={saving} />
		<Select.Root type="single" bind:value={newUnit}>
			<Select.Trigger class="w-28">{UNIT_LABELS[newUnit]}</Select.Trigger>
			<Select.Content>
				<Select.Item value="minutos">minutos</Select.Item>
				<Select.Item value="horas">horas</Select.Item>
				<Select.Item value="dias">dias</Select.Item>
			</Select.Content>
		</Select.Root>
		<Button type="button" variant="outline" disabled={saving} onclick={addOffset}>Adicionar</Button>
	</div>
</div>
