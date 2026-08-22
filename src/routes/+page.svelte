<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Button,
		buttonVariants,
		Card,
		LandingHero,
		LandingSteps,
		LandingFeatures,
		LandingRoadmap,
		LandingFooter,
		SectionHeading,
		TerminalWindow
	} from '@tabeladev/tabelawebui';
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
			color: 'var(--ctp-mauve)',
			title: 'Você escreve',
			body: 'Digita o pedido do jeito que você falaria: "marca dentista quinta às 15h".'
		},
		{
			number: '02',
			color: 'var(--ctp-sapphire)',
			title: 'A IA traduz',
			body: 'Sua chave, seu modelo. O TabelaCal vira a frase num evento estruturado: título, data, hora, local, recorrência.'
		},
		{
			number: '03',
			color: 'var(--ctp-peach)',
			title: 'Você confirma',
			body: 'Aparece um card com exatamente o que vai mudar. Nada acontece antes de você aprovar.'
		},
		{
			number: '04',
			color: 'var(--ctp-green)',
			title: 'Vai pra agenda',
			body: 'O evento entra no seu Google Calendar e fica registrado no histórico do app.'
		}
	];
</script>

{#snippet keyIcon()}
	<KeyRoundIcon class="twui-landing-feature-svg" />
{/snippet}
{#snippet shieldIcon()}
	<ShieldCheckIcon class="twui-landing-feature-svg" />
{/snippet}
{#snippet checkIcon()}
	<CircleCheckIcon class="twui-landing-feature-svg" />
{/snippet}
{#snippet bellIcon()}
	<BellRingIcon class="twui-landing-feature-svg" />
{/snippet}
{#snippet repeatIcon()}
	<RepeatIcon class="twui-landing-feature-svg" />
{/snippet}
{#snippet phoneIcon()}
	<SmartphoneIcon class="twui-landing-feature-svg" />
{/snippet}
{#snippet micIcon()}
	<MicIcon class="twui-landing-roadmap-icon" />
{/snippet}
{#snippet imageIcon()}
	<ImageIcon class="twui-landing-roadmap-icon" />
{/snippet}
{#snippet calendarPlusIcon()}
	<CalendarPlusIcon class="twui-landing-roadmap-icon" />
{/snippet}
{#snippet chatIcon()}
	<MessageCircleIcon class="twui-landing-roadmap-icon" />
{/snippet}

<svelte:head>
	<title>TabelaCal</title>
</svelte:head>

<div class="relative flex w-full flex-1 flex-col">
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-150"
		style="background-image: var(--gradient-hero)"
	></div>

	<div class="mx-auto flex w-full max-w-5xl flex-col gap-24 px-6 pt-16 pb-8 md:pt-24">
		<LandingHero
			eyebrow="Google Calendar em linguagem natural"
			title="Você escreve. A IA traduz. Você confirma."
			lead="Peça pra marcar, mudar, cancelar ou responder um convite — do jeito que você falaria com uma pessoa. O TabelaCal transforma isso num evento estruturado do Google Calendar, e só executa depois que você aprovar."
			note="Sua própria chave de IA + seu próprio projeto Google — a gente te guia em cada passo."
		>
			{#snippet actions()}
				<Button href={resolve('/onboarding/ai')} variant="primary" size="lg" class="shadow-glow"
					>Começar</Button
				>
				<Button href={REPO_URL} target="_blank" rel="noreferrer" variant="outline" size="lg">
					<CodeXmlIcon class="size-4" />
					Ver o código
				</Button>
			{/snippet}
		</LandingHero>

		<section aria-hidden="true">
			<TerminalWindow title="tabelacal — chat">
				<div class="flex flex-col gap-3">
					<p class="font-mono text-sm">
						<span class="text-accent-ink">›</span> marca reunião com o joão quinta às 15h no calendário
						de trabalho
					</p>
					<Card>
						<Card.Header>
							<Card.Title class="font-mono">Reunião com o João</Card.Title>
							<Card.Description class="font-mono text-xs"
								>qui, 15h – 16h · Trabalho</Card.Description
							>
						</Card.Header>
						<Card.Footer class="gap-2">
							<span class={buttonVariants({ variant: 'primary', size: 'sm' })}>Confirmar</span>
							<span class={buttonVariants({ variant: 'outline', size: 'sm' })}>Cancelar</span>
						</Card.Footer>
					</Card>
				</div>
			</TerminalWindow>
		</section>

		<section class="flex flex-col gap-8">
			<SectionHeading eyebrow="Como funciona" title="Quatro passos, e o evento tá na agenda." />
			<LandingSteps {steps} />
		</section>

		<section class="flex flex-col gap-8">
			<SectionHeading
				eyebrow="Recursos"
				title="O que ele faz, e o que ele não faz com os seus dados."
			/>
			<LandingFeatures
				features={[
					{
						icon: keyIcon,
						iconBg: 'color-mix(in srgb, var(--ctp-mauve) 12%, transparent)',
						iconColor: 'var(--ctp-mauve)',
						title: 'Sua chave, seu preço',
						body: 'Cole sua própria API key da DeepSeek, Anthropic ou OpenAI e escolha o modelo. Você paga direto pro provedor, sem taxa do TabelaCal por cima.'
					},
					{
						icon: shieldIcon,
						iconBg: 'color-mix(in srgb, var(--ctp-sapphire) 12%, transparent)',
						iconColor: 'var(--ctp-sapphire)',
						title: 'Sua agenda, seu Google',
						body: 'Você cria seu próprio projeto no Google Cloud. Nenhum app compartilhado entre usuários, e as credenciais ficam criptografadas no banco.'
					},
					{
						icon: checkIcon,
						iconBg: 'color-mix(in srgb, var(--ctp-green) 12%, transparent)',
						iconColor: 'var(--ctp-green)',
						title: 'Nada sem sua confirmação',
						body: 'Todo pedido vira um card de revisão. Você confirma, ajusta ou cancela antes de qualquer mudança real.'
					},
					{
						icon: bellIcon,
						iconBg: 'color-mix(in srgb, var(--ctp-peach) 12%, transparent)',
						iconColor: 'var(--ctp-peach)',
						title: 'Te avisa antes',
						body: 'Notificação push nos minutos, horas ou dias que você escolher antes de cada compromisso.'
					},
					{
						icon: repeatIcon,
						iconBg: 'color-mix(in srgb, var(--ctp-yellow) 12%, transparent)',
						iconColor: 'var(--ctp-yellow)',
						title: 'Recorrência e várias agendas',
						body: '"Toda segunda às 9h até o fim do mês", na agenda de trabalho. Dá pra editar só uma ocorrência ou a série inteira.'
					},
					{
						icon: phoneIcon,
						iconBg: 'color-mix(in srgb, var(--ctp-blue) 12%, transparent)',
						iconColor: 'var(--ctp-blue)',
						title: 'Instala como app',
						body: 'PWA no celular ou no desktop, com aviso quando sai uma versão nova.'
					}
				]}
			/>
		</section>

		<section class="flex flex-col gap-8">
			<SectionHeading
				eyebrow="No radar"
				title="O que vem depois."
				lead="Nada disso existe ainda. Tá aqui porque o roadmap é público — igual o código."
			/>
			<LandingRoadmap
				items={[
					{ icon: micIcon, label: 'Entrada por voz' },
					{ icon: imageIcon, label: 'Entrada por imagem' },
					{ icon: calendarPlusIcon, label: 'Apple e Outlook Calendar' },
					{ icon: chatIcon, label: 'WhatsApp e Telegram' }
				]}
			/>
		</section>

		<LandingFooter
			name="tabelacal"
			license="AGPL-3.0 · SvelteKit + Cloudflare Workers"
			repoUrl={REPO_URL}
			class="-mx-6 px-6"
		/>
	</div>
</div>
