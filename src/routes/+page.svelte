<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import TerminalWindow from '$lib/components/TerminalWindow.svelte';
	import SectionHeading from '$lib/components/SectionHeading.svelte';
	import CodeXmlIcon from '@lucide/svelte/icons/code-xml';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import BellRingIcon from '@lucide/svelte/icons/bell-ring';
	import RepeatIcon from '@lucide/svelte/icons/repeat';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
	import MicIcon from '@lucide/svelte/icons/mic';
	import ImageIcon from '@lucide/svelte/icons/image';
	import CalendarPlusIcon from '@lucide/svelte/icons/calendar-plus';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';

	const REPO_URL = 'https://github.com/TabelaDev/tabelacal';

	const steps = [
		{
			number: '01',
			color: 'text-ctp-mauve',
			title: 'Você escreve',
			body: 'Digita o pedido do jeito que você falaria: "marca dentista quinta às 15h".'
		},
		{
			number: '02',
			color: 'text-ctp-sapphire',
			title: 'A IA traduz',
			body: 'Sua chave, seu modelo. O TabelaCal vira a frase num evento estruturado: título, data, hora, local, recorrência.'
		},
		{
			number: '03',
			color: 'text-ctp-peach',
			title: 'Você confirma',
			body: 'Aparece um card com exatamente o que vai mudar. Nada acontece antes de você aprovar.'
		},
		{
			number: '04',
			color: 'text-ctp-green',
			title: 'Vai pra agenda',
			body: 'O evento entra no seu Google Calendar e fica registrado no histórico do app.'
		}
	];

	const features = [
		{
			icon: KeyRoundIcon,
			bgClass: 'bg-ctp-mauve/12',
			textClass: 'text-ctp-mauve',
			title: 'Sua chave, seu preço',
			body: 'Cole sua própria API key da DeepSeek, Anthropic ou OpenAI e escolha o modelo. Você paga direto pro provedor, sem taxa do TabelaCal por cima.'
		},
		{
			icon: ShieldCheckIcon,
			bgClass: 'bg-ctp-sapphire/12',
			textClass: 'text-ctp-sapphire',
			title: 'Sua agenda, seu Google',
			body: 'Você cria seu próprio projeto no Google Cloud. Nenhum app compartilhado entre usuários, e as credenciais ficam criptografadas no banco.'
		},
		{
			icon: CircleCheckIcon,
			bgClass: 'bg-ctp-green/12',
			textClass: 'text-ctp-green',
			title: 'Nada sem sua confirmação',
			body: 'Todo pedido vira um card de revisão. Você confirma, ajusta ou cancela antes de qualquer mudança real.'
		},
		{
			icon: BellRingIcon,
			bgClass: 'bg-ctp-peach/12',
			textClass: 'text-ctp-peach',
			title: 'Te avisa antes',
			body: 'Notificação push nos minutos, horas ou dias que você escolher antes de cada compromisso.'
		},
		{
			icon: RepeatIcon,
			bgClass: 'bg-ctp-yellow/12',
			textClass: 'text-ctp-yellow',
			title: 'Recorrência e várias agendas',
			body: '"Toda segunda às 9h até o fim do mês", na agenda de trabalho. Dá pra editar só uma ocorrência ou a série inteira.'
		},
		{
			icon: SmartphoneIcon,
			bgClass: 'bg-ctp-blue/12',
			textClass: 'text-ctp-blue',
			title: 'Instala como app',
			body: 'PWA no celular ou no desktop, com aviso quando sai uma versão nova.'
		}
	];

	const roadmap = [
		{ icon: MicIcon, label: 'Entrada por voz' },
		{ icon: ImageIcon, label: 'Entrada por imagem' },
		{ icon: CalendarPlusIcon, label: 'Apple e Outlook Calendar' },
		{ icon: MessageCircleIcon, label: 'WhatsApp e Telegram' }
	];
</script>

<svelte:head>
	<title>TabelaCal</title>
</svelte:head>

<div class="relative flex w-full flex-1 flex-col">
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px]"
		style="background-image: var(--gradient-hero)"
	></div>

	<div class="mx-auto flex w-full max-w-5xl flex-col gap-24 px-6 pt-16 pb-24 md:pt-24">
		<section class="flex flex-col gap-6 md:max-w-2xl">
			<p class="font-mono text-xs font-medium tracking-[0.2em] text-accent-ink uppercase">
				Google Calendar em linguagem natural
			</p>
			<h1 class="font-mono text-4xl font-bold tracking-tight text-balance md:text-6xl">
				Você escreve. A IA traduz. Você confirma.
			</h1>
			<p class="text-muted-foreground md:text-lg">
				Peça pra marcar, mudar, cancelar ou responder um convite — do jeito que você falaria com uma
				pessoa. O TabelaCal transforma isso num evento estruturado do Google Calendar, e só executa
				depois que você aprovar.
			</p>
			<div class="flex flex-col items-start gap-2">
				<div class="flex flex-wrap gap-3">
					<Button href={resolve('/onboarding/ai')} size="lg" class="shadow-glow">Começar</Button>
					<Button href={REPO_URL} target="_blank" rel="noreferrer" variant="outline" size="lg">
						<CodeXmlIcon class="size-4" />
						Ver o código
					</Button>
				</div>
				<p class="text-xs text-muted-foreground">
					Sua própria chave de IA + seu próprio projeto Google — a gente te guia em cada passo.
				</p>
			</div>
		</section>

		<section aria-hidden="true">
			<TerminalWindow title="tabelacal — chat">
				<div class="flex flex-col gap-3">
					<p class="font-mono text-sm">
						<span class="text-accent-ink">›</span> marca reunião com o joão quinta às 15h no calendário
						de trabalho
					</p>
					<Card.Root>
						<Card.Header>
							<Card.Title class="font-mono">Reunião com o João</Card.Title>
							<Card.Description class="font-mono text-xs"
								>qui, 15h – 16h · Trabalho</Card.Description
							>
						</Card.Header>
						<Card.Footer class="gap-2">
							<span class={buttonVariants({ size: 'sm' })}>Confirmar</span>
							<span class={buttonVariants({ variant: 'outline', size: 'sm' })}>Cancelar</span>
						</Card.Footer>
					</Card.Root>
				</div>
			</TerminalWindow>
		</section>

		<section class="flex flex-col gap-8">
			<SectionHeading eyebrow="Como funciona" title="Quatro passos, e o evento tá na agenda." />
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{#each steps as step (step.number)}
					<div class="flex flex-col gap-2">
						<span class="font-mono text-3xl font-bold {step.color}">{step.number}</span>
						<h3 class="font-mono text-base font-semibold">{step.title}</h3>
						<p class="text-sm text-muted-foreground">{step.body}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="flex flex-col gap-8">
			<SectionHeading
				eyebrow="Recursos"
				title="O que ele faz, e o que ele não faz com os seus dados."
			/>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each features as feature (feature.title)}
					<Card.Root>
						<Card.Content class="flex flex-col gap-3">
							<div class="flex size-9 items-center justify-center rounded-lg {feature.bgClass}">
								<feature.icon class="size-4.5 {feature.textClass}" />
							</div>
							<h3 class="font-mono text-base font-semibold">{feature.title}</h3>
							<p class="text-sm text-muted-foreground">{feature.body}</p>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</section>

		<section class="flex flex-col gap-8">
			<SectionHeading
				eyebrow="No radar"
				title="O que vem depois."
				lead="Nada disso existe ainda. Tá aqui porque o roadmap é público — igual o código."
			/>
			<div class="flex flex-wrap gap-2">
				{#each roadmap as item (item.label)}
					<Badge variant="outline" class="gap-1.5 py-1 font-mono text-xs font-normal">
						<item.icon class="size-3.5" />
						{item.label}
					</Badge>
				{/each}
			</div>
		</section>

		<footer
			class="flex flex-col items-start gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between"
		>
			<div>
				<span class="font-mono text-sm font-semibold">tabelacal</span>
				<p class="text-xs text-muted-foreground">AGPL-3.0 · SvelteKit + Cloudflare Workers</p>
			</div>
			<Button href={REPO_URL} target="_blank" rel="noreferrer" variant="ghost" size="sm">
				<CodeXmlIcon class="size-4" />
				Ver o código
			</Button>
		</footer>
	</div>
</div>
