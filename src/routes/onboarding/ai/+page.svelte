<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Input, Label, Card } from '@tabelhadev/tabelhawebui';
	import * as Select from '$lib/components/ui/select';
	import { AI_PROVIDERS, type AiProvider } from '$lib/ai-providers';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let provider = $state<AiProvider>('deepseek');
	let model = $state<string>(AI_PROVIDERS.deepseek.models[0]);

	$effect(() => {
		const models: readonly string[] = AI_PROVIDERS[provider].models;
		if (!models.includes(model)) model = models[0];
	});
</script>

<div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
	<Card>
		<Card.Header>
			<p class="font-mono text-xs font-medium tracking-[0.2em] text-accent-ink uppercase">
				Passo 1 de 2
			</p>
			<Card.Title class="font-mono">Configurar IA</Card.Title>
			<Card.Description>
				Cole sua própria API key e escolha o modelo que o TabelaCal vai usar pra interpretar seus
				pedidos de evento.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" use:enhance class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<Label for="provider-trigger">Provedor</Label>
					<Select.Root type="single" name="provider" bind:value={provider}>
						<Select.Trigger id="provider-trigger" class="w-full">
							{AI_PROVIDERS[provider].label}
						</Select.Trigger>
						<Select.Content>
							{#each Object.entries(AI_PROVIDERS) as [key, info] (key)}
								<Select.Item value={key}>{info.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="model-trigger">Modelo</Label>
					<Select.Root type="single" name="model" bind:value={model}>
						<Select.Trigger id="model-trigger" class="w-full">
							{model}
						</Select.Trigger>
						<Select.Content>
							{#each AI_PROVIDERS[provider].models as m (m)}
								<Select.Item value={m}>{m}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="apiKey">API key</Label>
					<Input
						id="apiKey"
						name="apiKey"
						type="password"
						autocomplete="off"
						required
						placeholder="sk-..."
					/>
					<p class="text-xs text-muted-foreground">
						{AI_PROVIDERS[provider].costHint}
						<a
							class="text-accent-ink underline underline-offset-4"
							href={AI_PROVIDERS[provider].keyUrl}
							target="_blank"
							rel="external noreferrer">Gerar uma chave de {AI_PROVIDERS[provider].label}</a
						>. O pagamento é direto pro provedor, sem taxa do TabelaCal por cima.
					</p>
				</div>

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}

				<Button type="submit" variant="primary">Continuar</Button>
			</form>
		</Card.Content>
	</Card>
</div>
