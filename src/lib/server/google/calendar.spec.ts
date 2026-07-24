import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	listCalendars,
	listCalendarEvents,
	createCalendarEvent,
	updateCalendarEvent,
	deleteCalendarEvent,
	respondToCalendarEvent
} from './calendar';

function mockFetchOnce(body: unknown, ok = true, status = ok ? 200 : 500) {
	return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
		ok,
		status,
		json: async () => body,
		text: async () => JSON.stringify(body)
	} as Response);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('listCalendars', () => {
	it('maps the calendarList response to id/summary pairs', async () => {
		const fetchSpy = mockFetchOnce({
			items: [
				{ id: 'primary', summary: 'ian@example.com' },
				{ id: 'trabalho@group.calendar.google.com', summary: 'Trabalho' }
			]
		});

		const result = await listCalendars('token');

		expect(result).toEqual([
			{ id: 'primary', summary: 'ian@example.com' },
			{ id: 'trabalho@group.calendar.google.com', summary: 'Trabalho' }
		]);
		expect(String(fetchSpy.mock.calls[0][0])).toContain('/users/me/calendarList');
	});
});

describe('listCalendarEvents', () => {
	it('maps Google API items to compact summaries, falling back to all-day dates', async () => {
		const fetchSpy = mockFetchOnce({
			items: [
				{
					id: 'evt-1',
					summary: 'Reunião',
					location: 'Sala 2',
					start: { dateTime: '2026-07-24T10:00:00-03:00' },
					end: { dateTime: '2026-07-24T11:00:00-03:00' }
				},
				{
					id: 'evt-2',
					start: { date: '2026-07-25' },
					end: { date: '2026-07-26' }
				}
			]
		});

		const result = await listCalendarEvents(
			'token',
			'2026-07-23T00:00:00Z',
			'2026-08-22T00:00:00Z'
		);

		expect(result).toEqual([
			{
				id: 'evt-1',
				calendarId: 'primary',
				recurringEventId: null,
				title: 'Reunião',
				startAt: '2026-07-24T10:00:00-03:00',
				endAt: '2026-07-24T11:00:00-03:00',
				location: 'Sala 2',
				description: null
			},
			{
				id: 'evt-2',
				calendarId: 'primary',
				recurringEventId: null,
				title: '(sem título)',
				startAt: '2026-07-25',
				endAt: '2026-07-26',
				location: null,
				description: null
			}
		]);

		const calledUrl = new URL(String(fetchSpy.mock.calls[0][0]));
		expect(calledUrl.pathname).toContain('/calendars/primary/events');
		expect(calledUrl.searchParams.get('timeMin')).toBe('2026-07-23T00:00:00Z');
		expect(calledUrl.searchParams.get('timeMax')).toBe('2026-08-22T00:00:00Z');
		expect(calledUrl.searchParams.get('singleEvents')).toBe('true');
		expect(calledUrl.searchParams.get('orderBy')).toBe('startTime');
	});

	it('carries recurringEventId through for recurring event instances', async () => {
		mockFetchOnce({
			items: [
				{
					id: 'evt-instance',
					recurringEventId: 'evt-series',
					summary: 'Alinhamento',
					start: { dateTime: '2026-07-27T09:00:00-03:00' },
					end: { dateTime: '2026-07-27T09:30:00-03:00' }
				}
			]
		});

		const result = await listCalendarEvents('token', 'a', 'b');
		expect(result[0].recurringEventId).toBe('evt-series');
	});

	it('aggregates and sorts events across multiple calendars by start time', async () => {
		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					items: [
						{
							id: 'evt-b',
							summary: 'Depois',
							start: { dateTime: '2026-07-25T10:00:00-03:00' },
							end: { dateTime: '2026-07-25T11:00:00-03:00' }
						}
					]
				}),
				text: async () => ''
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					items: [
						{
							id: 'evt-a',
							summary: 'Antes',
							start: { dateTime: '2026-07-24T10:00:00-03:00' },
							end: { dateTime: '2026-07-24T11:00:00-03:00' }
						}
					]
				}),
				text: async () => ''
			} as Response);

		const result = await listCalendarEvents('token', 'a', 'b', [
			'primary',
			'trabalho@group.calendar.google.com'
		]);

		expect(result.map((e) => e.id)).toEqual(['evt-a', 'evt-b']);
		expect(result[0].calendarId).toBe('trabalho@group.calendar.google.com');
		expect(result[1].calendarId).toBe('primary');
	});

	it('returns an empty array when the API responds without items', async () => {
		mockFetchOnce({});
		const result = await listCalendarEvents('token', 'a', 'b');
		expect(result).toEqual([]);
	});

	it('throws on a non-ok response', async () => {
		mockFetchOnce({ error: 'boom' }, false);
		await expect(listCalendarEvents('token', 'a', 'b')).rejects.toThrow(
			'Google Calendar API error'
		);
	});
});

describe('createCalendarEvent', () => {
	it('includes recurrence in the request body when provided', async () => {
		const fetchSpy = mockFetchOnce({ id: 'evt-1', htmlLink: 'https://example.com' });

		await createCalendarEvent('token', {
			title: 'Alinhamento',
			startAt: '2026-07-27T09:00:00-03:00',
			endAt: '2026-07-27T09:30:00-03:00',
			timezone: 'America/Sao_Paulo',
			recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO']
		});

		const [, init] = fetchSpy.mock.calls[0];
		expect(JSON.parse(String(init?.body))).toMatchObject({
			recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO']
		});
	});
});

describe('updateCalendarEvent', () => {
	it('sends a PATCH body containing only the changed fields, against the given calendar', async () => {
		const fetchSpy = mockFetchOnce({ id: 'evt-1', htmlLink: 'https://example.com' });

		await updateCalendarEvent(
			'token',
			'evt-1',
			{
				startAt: '2026-07-24T14:00:00-03:00',
				timezone: 'America/Sao_Paulo'
			},
			'trabalho@group.calendar.google.com'
		);

		const [url, init] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/calendars/trabalho%40group.calendar.google.com/events/evt-1');
		expect(init?.method).toBe('PATCH');
		expect(JSON.parse(String(init?.body))).toEqual({
			start: { dateTime: '2026-07-24T14:00:00-03:00', timeZone: 'America/Sao_Paulo' }
		});
	});
});

describe('deleteCalendarEvent', () => {
	it('treats a 404 as a no-op success (event already gone)', async () => {
		mockFetchOnce({}, false, 404);
		await expect(deleteCalendarEvent('token', 'evt-1')).resolves.toBeUndefined();
	});

	it('throws on other error statuses', async () => {
		mockFetchOnce({}, false, 500);
		await expect(deleteCalendarEvent('token', 'evt-1')).rejects.toThrow(
			'Google Calendar API error'
		);
	});
});

describe('respondToCalendarEvent', () => {
	it('patches the matching attendee responseStatus', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					attendees: [
						{ email: 'other@example.com', responseStatus: 'needsAction' },
						{ email: 'ME@Example.com', responseStatus: 'needsAction' }
					]
				}),
				text: async () => ''
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ id: 'evt-1', htmlLink: 'https://example.com' }),
				text: async () => ''
			} as Response);

		await respondToCalendarEvent('token', 'primary', 'evt-1', 'me@example.com', 'accepted');

		const [, init] = fetchSpy.mock.calls[1];
		const body = JSON.parse(String(init?.body)) as { attendees: Array<{ email: string }> };
		expect(body.attendees).toEqual([
			{ email: 'other@example.com', responseStatus: 'needsAction' },
			{ email: 'ME@Example.com', responseStatus: 'accepted' }
		]);
	});

	it('throws when the user is not an attendee of the event', async () => {
		mockFetchOnce({ attendees: [{ email: 'other@example.com', responseStatus: 'needsAction' }] });

		await expect(
			respondToCalendarEvent('token', 'primary', 'evt-1', 'me@example.com', 'accepted')
		).rejects.toThrow('lista de convidados');
	});
});
