import type { AiProvider } from '$lib/ai-providers';
import type { CalendarEventSummary } from '$lib/server/google/calendar';

export interface EventDraft {
	title: string;
	startAt: string; // ISO 8601 com timezone
	endAt: string;
	location: string | null;
	description: string | null;
	// RRULE(s) (RFC 5545), ex: ["RRULE:FREQ=WEEKLY;BYDAY=MO"]. null se não repetir.
	recurrence: string[] | null;
}

// Pra modify/delete de um evento recorrente: 'instance' afeta só a ocorrência
// identificada por eventId; 'series' afeta o evento "mestre" inteiro (todas as
// ocorrências, passadas e futuras — resolvido via recurringEventId na hora da
// execução). Default 'instance' quando a IA não especifica.
export type RecurrenceScope = 'instance' | 'series';

// Comando estruturado que a IA resolve a partir do texto livre — ver ESCOPO.md
// (fluxo: texto → comando → card de confirmação → execução no Google Calendar).
export type Command =
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

interface ParseCommandInput {
	provider: AiProvider;
	model: string;
	apiKey: string;
	text: string;
	now: string; // ISO 8601
	timezone: string;
	calendarEvents: CalendarEventSummary[];
}

const RECURRENCE_PROPERTY = {
	type: 'array',
	items: { type: 'string' },
	description:
		'Regra(s) de recorrência em formato RRULE (RFC 5545), ex: ["RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20260831T000000Z"]. Omita se o evento não se repetir.'
};

const SCOPE_PROPERTY = {
	type: 'string',
	enum: ['instance', 'series'],
	description:
		'Quando o evento faz parte de uma série recorrente: "instance" altera só essa ocorrência, "series" altera a série inteira. Default "instance" se o usuário não deixar claro que quer mudar todas as ocorrências.'
};

const CREATE_EVENT_SCHEMA = {
	type: 'object',
	properties: {
		title: { type: 'string' },
		start_at: { type: 'string', description: 'Data/hora de início em ISO 8601, com timezone' },
		end_at: { type: 'string', description: 'Data/hora de término em ISO 8601, com timezone' },
		location: { type: ['string', 'null'] },
		description: { type: ['string', 'null'] },
		recurrence: RECURRENCE_PROPERTY
	},
	required: ['title', 'start_at', 'end_at', 'location', 'description']
};

const MODIFY_EVENT_SCHEMA = {
	type: 'object',
	properties: {
		event_id: {
			type: 'string',
			description:
				'ID (do campo "id" na lista de eventos existentes fornecida no contexto) do evento a ser modificado'
		},
		scope: SCOPE_PROPERTY,
		title: { type: 'string' },
		start_at: { type: 'string', description: 'Nova data/hora de início em ISO 8601, com timezone' },
		end_at: { type: 'string', description: 'Nova data/hora de término em ISO 8601, com timezone' },
		location: { type: ['string', 'null'] },
		description: { type: ['string', 'null'] }
	},
	// Só event_id é obrigatório — inclua apenas os campos que de fato mudam.
	required: ['event_id']
};

const DELETE_EVENT_SCHEMA = {
	type: 'object',
	properties: {
		event_id: {
			type: 'string',
			description:
				'ID (do campo "id" na lista de eventos existentes fornecida no contexto) do evento a ser apagado'
		},
		scope: SCOPE_PROPERTY
	},
	required: ['event_id']
};

const RESPOND_EVENT_SCHEMA = {
	type: 'object',
	properties: {
		event_id: {
			type: 'string',
			description:
				'ID (do campo "id" na lista de eventos existentes fornecida no contexto) do evento/convite a responder'
		},
		response: {
			type: 'string',
			enum: ['accepted', 'declined', 'tentative'],
			description: 'Resposta ao convite: aceitar, recusar ou talvez/tentativo'
		}
	},
	required: ['event_id', 'response']
};

const LIST_EVENTS_SCHEMA = {
	type: 'object',
	properties: {},
	required: []
};

const UNRESOLVED_SCHEMA = {
	type: 'object',
	properties: {
		message: {
			type: 'string',
			description:
				'Mensagem em português explicando ao usuário o que falta pra entender o pedido (ex: evento ambíguo, evento não encontrado, pedido incompreensível)'
		}
	},
	required: ['message']
};

const COMMAND_TOOLS = [
	{
		name: 'create_event',
		description: 'Cria um novo evento de calendário',
		schema: CREATE_EVENT_SCHEMA
	},
	{
		name: 'modify_event',
		description:
			'Modifica um evento de calendário já existente (identificado por event_id, a partir da lista de eventos existentes fornecida no contexto)',
		schema: MODIFY_EVENT_SCHEMA
	},
	{
		name: 'delete_event',
		description:
			'Apaga um evento de calendário já existente (identificado por event_id, a partir da lista de eventos existentes fornecida no contexto)',
		schema: DELETE_EVENT_SCHEMA
	},
	{
		name: 'respond_event',
		description:
			'Responde a um convite de evento já existente (identificado por event_id, a partir da lista de eventos existentes fornecida no contexto): aceitar, recusar ou talvez',
		schema: RESPOND_EVENT_SCHEMA
	},
	{
		name: 'list_events',
		description: 'Lista/consulta os eventos do usuário, sem alterar nada',
		schema: LIST_EVENTS_SCHEMA
	},
	{
		name: 'unresolved',
		description:
			'Usado quando não é possível identificar com confiança o comando pedido ou o evento existente referido (ambiguidade, evento não encontrado, pedido incompreensível)',
		schema: UNRESOLVED_SCHEMA
	}
] as const;

function formatCalendarContext(calendarEvents: CalendarEventSummary[]): string {
	if (calendarEvents.length === 0) return 'Nenhum evento encontrado nos próximos 30 dias.';
	return calendarEvents
		.map((e) => {
			const location = e.location ? ` | local=${e.location}` : '';
			const recurring = e.recurringEventId ? ` | parte de uma série recorrente` : '';
			return `- id=${e.id} | agenda=${e.calendarId} | ${e.title} | início=${e.startAt} | fim=${e.endAt}${location}${recurring}`;
		})
		.join('\n');
}

function systemPrompt(
	now: string,
	timezone: string,
	calendarEvents: CalendarEventSummary[]
): string {
	return (
		`Você traduz pedidos em linguagem natural (português) sobre calendário para um comando estruturado. ` +
		`Data/hora atual: ${now}. Timezone do usuário: ${timezone}.\n\n` +
		`Eventos existentes do usuário em todas as agendas conectadas (próximos 30 dias), cada um com o id da agenda (campo agenda=) e se é parte de uma série recorrente:\n${formatCalendarContext(calendarEvents)}\n\n` +
		`Chame exatamente UMA ferramenta, de acordo com a intenção do usuário:\n` +
		`- create_event: criar um novo evento. Use "recurrence" (RRULE) se o usuário pedir algo repetitivo (ex: "toda segunda às 9h até o fim do mês").\n` +
		`- modify_event: alterar um evento já existente (use um "id" da lista acima; em changes inclua só os campos que mudam; use "scope": "series" só se o usuário deixar claro que quer mudar a série inteira, não só uma ocorrência).\n` +
		`- delete_event: apagar um evento já existente (mesma lógica de "scope" do modify_event).\n` +
		`- respond_event: aceitar/recusar/talvez um convite pra um evento já existente.\n` +
		`- list_events: quando o usuário só quer ver/consultar os eventos, sem alterar nada.\n` +
		`- unresolved: quando não for possível identificar com confiança o comando ou o evento referido (ex: mais de um evento compatível, nenhum evento compatível, ou pedido incompreensível) — explique em "message" o que falta pra prosseguir.\n` +
		`Se o usuário não especificar duração ao criar um evento, assuma 1 hora. Responda só chamando uma ferramenta, nunca em texto livre.`
	);
}

export async function parseCommandFromText(input: ParseCommandInput): Promise<Command> {
	if (input.provider === 'anthropic') return parseWithAnthropic(input);
	if (input.provider === 'openai') return parseWithOpenAI(input);
	throw new Error(`Provider de IA não suportado: ${input.provider}`);
}

async function parseWithAnthropic(input: ParseCommandInput): Promise<Command> {
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
			system: systemPrompt(input.now, input.timezone, input.calendarEvents),
			messages: [{ role: 'user', content: input.text }],
			tools: COMMAND_TOOLS.map((tool) => ({
				name: tool.name,
				description: tool.description,
				input_schema: tool.schema
			})),
			tool_choice: { type: 'any' }
		})
	});
	if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);

	const data = (await res.json()) as {
		content: Array<{ type: string; name?: string; input?: unknown }>;
	};
	const toolUse = data.content.find((block) => block.type === 'tool_use');
	if (!toolUse || !toolUse.name) throw new Error('IA não retornou um comando estruturado');
	return toCommand(toolUse.name, toolUse.input, input.calendarEvents);
}

async function parseWithOpenAI(input: ParseCommandInput): Promise<Command> {
	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${input.apiKey}`
		},
		body: JSON.stringify({
			model: input.model,
			messages: [
				{ role: 'system', content: systemPrompt(input.now, input.timezone, input.calendarEvents) },
				{ role: 'user', content: input.text }
			],
			tools: COMMAND_TOOLS.map((tool) => ({
				type: 'function',
				function: { name: tool.name, description: tool.description, parameters: tool.schema }
			})),
			tool_choice: 'required'
		})
	});
	if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);

	const data = (await res.json()) as {
		choices: Array<{
			message: { tool_calls?: Array<{ function: { name: string; arguments: string } }> };
		}>;
	};
	const toolCall = data.choices[0]?.message.tool_calls?.[0];
	if (!toolCall) throw new Error('IA não retornou um comando estruturado');
	return toCommand(
		toolCall.function.name,
		JSON.parse(toolCall.function.arguments),
		input.calendarEvents
	);
}

function findCalendarEvent(
	calendarEvents: CalendarEventSummary[],
	eventId: string
): CalendarEventSummary | null {
	return calendarEvents.find((e) => e.id === eventId) ?? null;
}

function toCommand(
	name: string,
	rawInput: unknown,
	calendarEvents: CalendarEventSummary[]
): Command {
	switch (name) {
		case 'create_event':
			return { type: 'create', draft: toEventDraft(rawInput) };

		case 'modify_event': {
			const parsed = rawInput as { event_id: string; scope?: RecurrenceScope } & Partial<{
				title: string;
				start_at: string;
				end_at: string;
				location: string | null;
				description: string | null;
			}>;
			const before = findCalendarEvent(calendarEvents, parsed.event_id);
			return {
				type: 'modify',
				eventId: parsed.event_id,
				calendarId: before?.calendarId ?? 'primary',
				scope: parsed.scope ?? 'instance',
				before,
				changes: toPartialEventDraft(parsed)
			};
		}

		case 'delete_event': {
			const parsed = rawInput as { event_id: string; scope?: RecurrenceScope };
			const event = findCalendarEvent(calendarEvents, parsed.event_id);
			return {
				type: 'delete',
				eventId: parsed.event_id,
				calendarId: event?.calendarId ?? 'primary',
				scope: parsed.scope ?? 'instance',
				event
			};
		}

		case 'respond_event': {
			const parsed = rawInput as {
				event_id: string;
				response: 'accepted' | 'declined' | 'tentative';
			};
			const event = findCalendarEvent(calendarEvents, parsed.event_id);
			return {
				type: 'respond',
				eventId: parsed.event_id,
				calendarId: event?.calendarId ?? 'primary',
				response: parsed.response,
				event
			};
		}

		case 'list_events':
			return { type: 'list', events: calendarEvents };

		case 'unresolved': {
			const parsed = rawInput as { message: string };
			return { type: 'unresolved', message: parsed.message };
		}

		default:
			throw new Error(`IA chamou uma ferramenta desconhecida: ${name}`);
	}
}

function toEventDraft(input: unknown): EventDraft {
	const parsed = input as {
		title: string;
		start_at: string;
		end_at: string;
		location: string | null;
		description: string | null;
		recurrence?: string[];
	};
	return {
		title: parsed.title,
		startAt: parsed.start_at,
		endAt: parsed.end_at,
		location: parsed.location ?? null,
		description: parsed.description ?? null,
		recurrence: parsed.recurrence && parsed.recurrence.length > 0 ? parsed.recurrence : null
	};
}

function toPartialEventDraft(parsed: {
	title?: string;
	start_at?: string;
	end_at?: string;
	location?: string | null;
	description?: string | null;
}): Partial<EventDraft> {
	const changes: Partial<EventDraft> = {};
	if (parsed.title !== undefined) changes.title = parsed.title;
	if (parsed.start_at !== undefined) changes.startAt = parsed.start_at;
	if (parsed.end_at !== undefined) changes.endAt = parsed.end_at;
	if (parsed.location !== undefined) changes.location = parsed.location;
	if (parsed.description !== undefined) changes.description = parsed.description;
	return changes;
}
