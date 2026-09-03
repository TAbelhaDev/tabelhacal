<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import { Button, Input, Label, Card } from '@tabelhadev/tabelhawebui';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let timezone = $derived(browser ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');

	interface SetupStep {
		title: string;
		description: string;
		items?: string[];
		outro?: string;
		url: string;
		urlLabel: string;
		note?: string;
		showRedirectUri?: boolean;
	}

	const STEPS: SetupStep[] = [
		{
			title: 'Criar um projeto no Google Cloud',
			description: 'Escolha qualquer nome (ex: "TAbelhaCal"). Você só faz isso uma vez.',
			url: 'https://console.cloud.google.com/projectcreate',
			urlLabel: 'Abrir Google Cloud Console'
		},
		{
			title: 'Ativar a Calendar API',
			description:
				'Com o projeto novo selecionado, clique em "Enable" (Ativar) na página da Calendar API.',
			url: 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com',
			urlLabel: 'Ativar Calendar API'
		},
		{
			title: 'Configurar a tela de consentimento',
			description: 'Clique em "Get started" (Começar) e preencha:',
			items: [
				'Nome do app: qualquer um (ex: "TAbelhaCal")',
				'E-mail de suporte: o seu e-mail',
				'Audiência ("Audience"): selecione "External"'
			],
			outro: 'Confirme e finalize — nada aqui fica visível pra ninguém além de você.',
			url: 'https://console.cloud.google.com/auth/overview',
			urlLabel: 'Abrir Google Auth Platform'
		},
		{
			title: 'Adicionar você como test user',
			description:
				'Na página "Audience" (Audiência), em "Test users", clique em "Add users" e coloque o e-mail Google que você quer conectar.',
			url: 'https://console.cloud.google.com/auth/audience',
			urlLabel: 'Abrir página Audience',
			note: 'Use o mesmo e-mail Google que você vai conectar no próximo passo — com um e-mail diferente, o Google recusa o login com "acesso bloqueado".'
		},
		{
			title: 'Criar as credenciais OAuth',
			description: 'Na página "Clients", clique em "Create client" (Criar cliente) e preencha:',
			items: [
				'Tipo de aplicativo ("Application type"): selecione "Web application"',
				'URI de redirecionamento autorizado ("Authorized redirect URI"): cole o valor abaixo'
			],
			outro:
				'Depois de criar, copie o Client ID e o Client Secret gerados — você vai colar os dois no próximo passo.',
			url: 'https://console.cloud.google.com/auth/clients',
			urlLabel: 'Abrir página Clients',
			showRedirectUri: true
		}
	];

	type Screen = 'intro' | number | 'credentials';
	let screen = $state<Screen>('intro');
	let copied = $state(false);

	async function copyRedirectUri() {
		await navigator.clipboard.writeText(data.redirectUri);
		copied = true;
		toast.success('URI copiada.');
		setTimeout(() => (copied = false), 2000);
	}

	function next() {
		if (screen === 'intro') screen = 0;
		else if (typeof screen === 'number') {
			screen = screen === STEPS.length - 1 ? 'credentials' : screen + 1;
		}
	}

	function back() {
		if (screen === 'credentials') screen = STEPS.length - 1;
		else if (typeof screen === 'number') {
			screen = screen === 0 ? 'intro' : screen - 1;
		}
	}
</script>

<div class="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 p-6">
	<Card>
		<Card.Header>
			<p class="font-mono text-xs font-medium tracking-[0.2em] text-accent-ink uppercase">
				Passo 2 de 2
			</p>
			<Card.Title class="font-mono">Conectar Google Calendar</Card.Title>
			<Card.Description>
				O TAbelhaCal não tem um app do Google compartilhado entre usuários.
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-6">
			{#if screen === 'intro'}
				<p class="text-sm text-muted-foreground">
					Se todo mundo usasse o mesmo app do Google, ele passaria do limite de usuários de teste e
					precisaria de uma revisão paga do Google pra escopos sensíveis como o do Calendar. Pra
					evitar esse custo, cada pessoa cria seu próprio projeto no Google Cloud (gratuito, uns 2
					minutos) e cola aqui o Client ID e o Client Secret gerados nele.
				</p>
				<p class="text-sm text-muted-foreground">
					As duas credenciais ficam criptografadas no banco do TAbelhaCal — nunca em texto puro, e
					nunca vistas por mais ninguém.
				</p>
				<div class="flex flex-col gap-2">
					<Button variant="primary" onclick={next}>Não tenho ainda, me guia</Button>
					<Button variant="outline" onclick={() => (screen = 'credentials')}>
						Já tenho as credenciais
					</Button>
				</div>
			{:else if typeof screen === 'number'}
				{@const step = STEPS[screen]}
				<div class="flex flex-col gap-3">
					<div class="flex items-baseline gap-3">
						<span class="font-mono text-3xl font-bold text-accent-ink"
							>{String(screen + 1).padStart(2, '0')}</span
						>
						<div class="flex flex-col">
							<span class="text-xs text-muted-foreground">de {STEPS.length}</span>
							<h2 class="font-mono text-lg font-semibold">{step.title}</h2>
						</div>
					</div>
					<p class="text-sm text-muted-foreground">{step.description}</p>

					{#if step.items}
						<ol class="flex flex-col gap-1.5">
							{#each step.items as item, i (item)}
								<li class="flex gap-2 text-sm text-muted-foreground">
									<span class="font-mono text-xs text-muted-foreground/70">{i + 1}.</span>
									<span>{item}</span>
								</li>
							{/each}
						</ol>
					{/if}

					{#if step.note}
						<p class="rounded-md border-l-2 border-ctp-yellow bg-ctp-yellow/8 px-3 py-2 text-xs">
							{step.note}
						</p>
					{/if}

					{#if step.showRedirectUri}
						<div class="flex flex-col gap-1">
							<Label>URI de redirecionamento autorizado ("Authorized redirect URI")</Label>
							<div class="flex items-center gap-2">
								<code
									class="block flex-1 rounded-md border border-border bg-muted px-2 py-1 text-xs break-all"
									>{data.redirectUri}</code
								>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									onclick={copyRedirectUri}
									aria-label="Copiar URI"
								>
									{#if copied}
										<CheckIcon class="size-3.5" />
									{:else}
										<CopyIcon class="size-3.5" />
									{/if}
								</Button>
							</div>
						</div>
					{/if}

					{#if step.outro}
						<p class="text-sm text-muted-foreground">{step.outro}</p>
					{/if}

					<Button variant="outline" href={step.url} target="_blank" rel="noreferrer" class="w-fit">
						{step.urlLabel} ↗
					</Button>
				</div>

				<div class="flex justify-between gap-2">
					<Button variant="ghost" onclick={back}>Voltar</Button>
					<Button variant="primary" onclick={next}>
						{screen === STEPS.length - 1 ? 'Já criei, colar credenciais' : 'Avançar'}
					</Button>
				</div>
			{:else}
				<form method="POST" use:enhance class="flex flex-col gap-4">
					<input type="hidden" name="timezone" value={timezone} />
					<div class="flex flex-col gap-2">
						<Label for="clientId">Client ID</Label>
						<Input
							id="clientId"
							name="clientId"
							autocomplete="off"
							required
							placeholder="xxx.apps.googleusercontent.com"
						/>
					</div>

					<div class="flex flex-col gap-2">
						<Label for="clientSecret">Client Secret</Label>
						<Input
							id="clientSecret"
							name="clientSecret"
							type="password"
							autocomplete="off"
							required
						/>
					</div>

					<p class="text-xs text-muted-foreground">
						Fuso horário detectado: <strong>{timezone}</strong>. Se estiver errado, ajuste depois
						nas configurações do seu navegador e refaça o cadastro.
					</p>

					{#if form?.error}
						<p class="text-sm text-destructive">{form.error}</p>
					{/if}

					<div class="flex justify-between gap-2">
						<Button type="button" variant="ghost" onclick={back}>Voltar</Button>
						<Button type="submit" variant="primary">Conectar com Google</Button>
					</div>
				</form>
			{/if}
		</Card.Content>
	</Card>
</div>
