import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseCommandFromText, type Command } from './parse';
import type { CalendarEventSummary, CalendarInfo } from '$lib/server/google/calendar';

const calendars: CalendarInfo[] = [
	{ id: 'primary', summary: 'ian@example.com' },
	{ id: 'trabalho@group.calendar.google.com', summary: 'Trabalho' }
];

const calendarEvents: CalendarEventSummary[] = [
	{
		id: 'evt-1',
		calendarId: 'primary',
		recurringEventId: null,
		title: 'Reunião com o João',
		startAt: '2026-07-24T10:00:00-03:00',
		endAt: '2026-07-24T11:00:00-03:00',
		location: null,
		description: null
	},
	{
		id: 'evt-2-instance',
		calendarId: 'trabalho@group.calendar.google.com',
		recurringEventId: 'evt-2-series',
		title: 'Alinhamento semanal',
		startAt: '2026-07-27T09:00:00-03:00',
		endAt: '2026-07-27T09:30:00-03:00',
		location: null,
		description: null
	}
];

function baseInput(overrides: Partial<Parameters<typeof parseCommandFromText>[0]> = {}) {
	return {
		provider: 'anthropic' as const,
		model: 'claude-sonnet-5',
		apiKey: 'test-key',
		text: 'texto qualquer',
		now: '2026-07-23T12:00:00-03:00',
		timezone: 'America/Sao_Paulo',
		calendarEvents,
		calendars,
		...overrides
	};
}

function mockFetchOnce(body: unknown, ok = true) {
	return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
		ok,
		status: ok ? 200 : 500,
		json: async () => body,
		text: async () => JSON.stringify(body)
	} as Response);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('parseCommandFromText (anthropic)', () => {
	it('maps a create_event tool call to a create command', async () => {
		mockFetchOnce({
			content: [
				{
					type: 'tool_use',
					name: 'create_event',
					input: {
						title: 'Dentista',
						start_at: '2026-07-24T15:00:00-03:00',
						end_at: '2026-07-24T16:00:00-03:00',
						location: null,
						description: null
					}
				}
			]
		});

		const command = await parseCommandFromText(baseInput());

		expect(command).toEqual<Command>({
			type: 'create',
			draft: {
				title: 'Dentista',
				startAt: '2026-07-24T15:00:00-03:00',
				endAt: '2026-07-24T16:00:00-03:00',
				location: null,
				description: null,
				recurrence: null,
				calendarId: null
			}
		});
	});

	it('maps a create_event tool call with an explicit calendar_id to a create command targeting that calendar', async () => {
		mockFetchOnce({
			content: [
				{
					type: 'tool_use',
					name: 'create_event',
					input: {
						title: 'Reunião de equipe',
						start_at: '2026-07-24T15:00:00-03:00',
						end_at: '2026-07-24T16:00:00-03:00',
						location: null,
						description: null,
						calendar_id: 'trabalho@group.calendar.google.com'
					}
				}
			]
		});

		const command = await parseCommandFromText(
			baseInput({ text: 'reunião de equipe quinta às 15h no calendário de trabalho' })
		);

		expect(command).toEqual<Command>({
			type: 'create',
			draft: {
				title: 'Reunião de equipe',
				startAt: '2026-07-24T15:00:00-03:00',
				endAt: '2026-07-24T16:00:00-03:00',
				location: null,
				description: null,
				recurrence: null,
				calendarId: 'trabalho@group.calendar.google.com'
			}
		});
	});

	it('maps a create_event tool call with recurrence to a create command carrying the RRULE', async () => {
		mockFetchOnce({
			content: [
				{
					type: 'tool_use',
					name: 'create_event',
					input: {
						title: 'Reunião de alinhamento',
						start_at: '2026-07-27T09:00:00-03:00',
						end_at: '2026-07-27T09:30:00-03:00',
						location: null,
						description: null,
						recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20260831T000000Z']
					}
				}
			]
		});

		const command = await parseCommandFromText(
			baseInput({ text: 'reunião de alinhamento toda segunda às 9h até o fim do mês' })
		);

		expect(command).toEqual<Command>({
			type: 'create',
			draft: {
				title: 'Reunião de alinhamento',
				startAt: '2026-07-27T09:00:00-03:00',
				endAt: '2026-07-27T09:30:00-03:00',
				location: null,
				description: null,
				recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20260831T000000Z'],
				calendarId: null
			}
		});
	});

	it('maps a modify_event tool call to a modify command, resolving the matched event and its calendar', async () => {
		mockFetchOnce({
			content: [
				{
					type: 'tool_use',
					name: 'modify_event',
					input: { event_id: 'evt-1', start_at: '2026-07-24T14:00:00-03:00' }
				}
			]
		});

		const command = await parseCommandFromText(
			baseInput({ text: 'move a reunião com o joão pra 14h' })
		);

		expect(command).toEqual<Command>({
			type: 'modify',
			eventId: 'evt-1',
			calendarId: 'primary',
			scope: 'instance',
			before: calendarEvents[0],
			changes: { startAt: '2026-07-24T14:00:00-03:00' }
		});
	});

	it('defaults scope to instance and resolves calendarId from a non-primary calendar', async () => {
		mockFetchOnce({
			content: [
				{
					type: 'tool_use',
					name: 'delete_event',
					input: { event_id: 'evt-2-instance' }
				}
			]
		});

		const command = await parseCommandFromText(
			baseInput({ text: 'cancela o alinhamento dessa semana' })
		);

		expect(command).toEqual<Command>({
			type: 'delete',
			eventId: 'evt-2-instance',
			calendarId: 'trabalho@group.calendar.google.com',
			scope: 'instance',
			event: calendarEvents[1]
		});
	});

	it('maps a delete_event tool call with scope=series to a delete command with that scope', async () => {
		mockFetchOnce({
			content: [
				{
					type: 'tool_use',
					name: 'delete_event',
					input: { event_id: 'evt-2-instance', scope: 'series' }
				}
			]
		});

		const command = await parseCommandFromText(
			baseInput({ text: 'cancela todas as reuniões de alinhamento' })
		);

		expect(command).toEqual<Command>({
			type: 'delete',
			eventId: 'evt-2-instance',
			calendarId: 'trabalho@group.calendar.google.com',
			scope: 'series',
			event: calendarEvents[1]
		});
	});

	it('maps a respond_event tool call to a respond command', async () => {
		mockFetchOnce({
			content: [
				{
					type: 'tool_use',
					name: 'respond_event',
					input: { event_id: 'evt-1', response: 'accepted' }
				}
			]
		});

		const command = await parseCommandFromText(baseInput({ text: 'aceita a reunião com o joão' }));

		expect(command).toEqual<Command>({
			type: 'respond',
			eventId: 'evt-1',
			calendarId: 'primary',
			response: 'accepted',
			event: calendarEvents[0]
		});
	});

	it('maps a list_events tool call to a list command carrying the pre-fetched events', async () => {
		mockFetchOnce({
			content: [{ type: 'tool_use', name: 'list_events', input: {} }]
		});

		const command = await parseCommandFromText(baseInput({ text: 'o que eu tenho essa semana?' }));

		expect(command).toEqual<Command>({ type: 'list', events: calendarEvents });
	});

	it('maps an unresolved tool call to an unresolved command with the clarification message', async () => {
		mockFetchOnce({
			content: [
				{
					type: 'tool_use',
					name: 'unresolved',
					input: { message: 'Encontrei mais de um evento compatível, qual deles?' }
				}
			]
		});

		const command = await parseCommandFromText(baseInput({ text: 'cancela a reunião' }));

		expect(command).toEqual<Command>({
			type: 'unresolved',
			message: 'Encontrei mais de um evento compatível, qual deles?'
		});
	});

	it('throws when the Anthropic API responds with an error status', async () => {
		mockFetchOnce({ error: 'boom' }, false);

		await expect(parseCommandFromText(baseInput())).rejects.toThrow('Anthropic API error');
	});
});

describe('parseCommandFromText (openai)', () => {
	it('maps a create_event function call to a create command', async () => {
		mockFetchOnce({
			choices: [
				{
					message: {
						tool_calls: [
							{
								function: {
									name: 'create_event',
									arguments: JSON.stringify({
										title: 'Dentista',
										start_at: '2026-07-24T15:00:00-03:00',
										end_at: '2026-07-24T16:00:00-03:00',
										location: null,
										description: null
									})
								}
							}
						]
					}
				}
			]
		});

		const command = await parseCommandFromText(baseInput({ provider: 'openai', model: 'gpt-5.1' }));

		expect(command.type).toBe('create');
	});
});
