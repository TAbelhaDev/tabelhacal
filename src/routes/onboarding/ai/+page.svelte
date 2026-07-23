<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { AI_PROVIDERS, type AiProvider } from '$lib/ai-providers';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let provider = $state<AiProvider>('anthropic');
	let model = $state<string>(AI_PROVIDERS.anthropic.models[0]);

	$effect(() => {
		const models: readonly string[] = AI_PROVIDERS[provider].models;
		if (!models.includes(model)) model = models[0];
	});
</script>

<div class="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 p-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Configurar IA</Card.Title>
			<Card.Description>
				Passo 1 de 2 — cole sua própria API key e escolha o modelo que o Gosplan vai usar pra
				interpretar seus pedidos de evento.
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
				</div>

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}

				<Button type="submit">Continuar</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
