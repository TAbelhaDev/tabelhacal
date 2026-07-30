<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let timezone = $derived(browser ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
</script>

<div class="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 p-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Conectar Google Calendar</Card.Title>
			<Card.Description>
				Passo 2 de 2 — o NDRC não tem um app do Google compartilhado entre usuários. Você cria o seu
				próprio projeto no Google Cloud (gratuito, leva uns 2 minutos) e cola as credenciais aqui.
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-6">
			<ol class="flex flex-col gap-3 text-sm">
				<li>
					1. Abra o
					<a
						class="underline underline-offset-4"
						href="https://console.cloud.google.com/projectcreate"
						target="_blank"
						rel="noreferrer">Google Cloud Console</a
					>
					e crie um projeto novo.
				</li>
				<li>2. Nesse projeto, ative a <strong>Google Calendar API</strong>.</li>
				<li>
					3. Configure a <strong>tela de consentimento OAuth</strong> em modo
					<strong>Testing</strong>, e adicione seu próprio e-mail Google como
					<strong>test user</strong>.
				</li>
				<li>
					4. Crie uma credencial <strong>OAuth Client ID</strong> do tipo
					<strong>Web application</strong>, com esta <strong>Authorized redirect URI</strong>:
					<code class="mt-1 block rounded-md bg-muted px-2 py-1 text-xs break-all"
						>{data.redirectUri}</code
					>
				</li>
				<li>5. Copie o Client ID e o Client Secret gerados e cole abaixo.</li>
			</ol>

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

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}

				<Button type="submit">Conectar com Google</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
