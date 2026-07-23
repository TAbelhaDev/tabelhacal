import type { AiProvider } from '$lib/ai-providers';

export interface EventDraft {
	title: string;
	startAt: string; // ISO 8601 com timezone
	endAt: string;
	location: string | null;
	description: string | null;
}

interface ParseEventInput {
	provider: AiProvider;
	model: string;
	apiKey: string;
	text: string;
	now: string; // ISO 8601
	timezone: string;
}

const EVENT_SCHEMA = {
	type: 'object',
	properties: {
		title: { type: 'string' },
		start_at: { type: 'string', description: 'Data/hora de início em ISO 8601, com timezone' },
		end_at: { type: 'string', description: 'Data/hora de término em ISO 8601, com timezone' },
		location: { type: ['string', 'null'] },
		description: { type: ['string', 'null'] }
	},
	required: ['title', 'start_at', 'end_at', 'location', 'description']
};

function systemPrompt(now: string, timezone: string): string {
	return (
		`Você extrai eventos de calendário a partir de linguagem natural em português. ` +
		`Data/hora atual: ${now}. Timezone do usuário: ${timezone}. ` +
		`Se o usuário não especificar duração, assuma 1 hora. Responda só chamando a ferramenta.`
	);
}

export async function parseEventFromText(input: ParseEventInput): Promise<EventDraft> {
	if (input.provider === 'anthropic') return parseWithAnthropic(input);
	if (input.provider === 'openai') return parseWithOpenAI(input);
	throw new Error(`Provider de IA não suportado: ${input.provider}`);
}

async function parseWithAnthropic(input: ParseEventInput): Promise<EventDraft> {
	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': input.apiKey,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: input.model,
			max_tokens: 1024,
			system: systemPrompt(input.now, input.timezone),
			messages: [{ role: 'user', content: input.text }],
			tools: [
				{
					name: 'create_event',
					description: 'Estrutura um evento de calendário a partir do pedido do usuário',
					input_schema: EVENT_SCHEMA
				}
			],
			tool_choice: { type: 'tool', name: 'create_event' }
		})
	});
	if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);

	const data = (await res.json()) as { content: Array<{ type: string; input?: unknown }> };
	const toolUse = data.content.find((block) => block.type === 'tool_use');
	if (!toolUse) throw new Error('IA não retornou um evento estruturado');
	return toEventDraft(toolUse.input);
}

async function parseWithOpenAI(input: ParseEventInput): Promise<EventDraft> {
	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${input.apiKey}`
		},
		body: JSON.stringify({
			model: input.model,
			messages: [
				{ role: 'system', content: systemPrompt(input.now, input.timezone) },
				{ role: 'user', content: input.text }
			],
			tools: [
				{
					type: 'function',
					function: {
						name: 'create_event',
						description: 'Estrutura um evento de calendário a partir do pedido do usuário',
						parameters: EVENT_SCHEMA
					}
				}
			],
			tool_choice: { type: 'function', function: { name: 'create_event' } }
		})
	});
	if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);

	const data = (await res.json()) as {
		choices: Array<{ message: { tool_calls?: Array<{ function: { arguments: string } }> } }>;
	};
	const toolCall = data.choices[0]?.message.tool_calls?.[0];
	if (!toolCall) throw new Error('IA não retornou um evento estruturado');
	return toEventDraft(JSON.parse(toolCall.function.arguments));
}

function toEventDraft(input: unknown): EventDraft {
	const parsed = input as {
		title: string;
		start_at: string;
		end_at: string;
		location: string | null;
		description: string | null;
	};
	return {
		title: parsed.title,
		startAt: parsed.start_at,
		endAt: parsed.end_at,
		location: parsed.location ?? null,
		description: parsed.description ?? null
	};
}
