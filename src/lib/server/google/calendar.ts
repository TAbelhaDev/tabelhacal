const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export interface CalendarEventInput {
	title: string;
	startAt: string; // ISO 8601
	endAt: string;
	timezone: string;
	location?: string | null;
	description?: string | null;
}

export interface CalendarEvent {
	id: string;
	htmlLink: string;
}

export async function createCalendarEvent(
	accessToken: string,
	event: CalendarEventInput
): Promise<CalendarEvent> {
	return callCalendarApi(CALENDAR_EVENTS_URL, accessToken, 'POST', toGoogleEventBody(event));
}

export async function updateCalendarEvent(
	accessToken: string,
	googleEventId: string,
	event: CalendarEventInput
): Promise<CalendarEvent> {
	return callCalendarApi(
		`${CALENDAR_EVENTS_URL}/${googleEventId}`,
		accessToken,
		'PATCH',
		toGoogleEventBody(event)
	);
}

export async function deleteCalendarEvent(
	accessToken: string,
	googleEventId: string
): Promise<void> {
	const res = await fetch(`${CALENDAR_EVENTS_URL}/${googleEventId}`, {
		method: 'DELETE',
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok && res.status !== 404) {
		throw new Error(`Google Calendar API error: ${res.status} ${await res.text()}`);
	}
}

function toGoogleEventBody(event: CalendarEventInput) {
	return {
		summary: event.title,
		location: event.location ?? undefined,
		description: event.description ?? undefined,
		start: { dateTime: event.startAt, timeZone: event.timezone },
		end: { dateTime: event.endAt, timeZone: event.timezone }
	};
}

async function callCalendarApi(
	url: string,
	accessToken: string,
	method: string,
	body: unknown
): Promise<CalendarEvent> {
	const res = await fetch(url, {
		method,
		headers: {
			authorization: `Bearer ${accessToken}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`Google Calendar API error: ${res.status} ${await res.text()}`);
	return res.json();
}
