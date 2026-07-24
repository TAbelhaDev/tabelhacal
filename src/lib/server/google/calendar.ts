const CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3';

function eventsUrl(calendarId: string): string {
	return `${CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events`;
}

export interface CalendarEventInput {
	title: string;
	startAt: string; // ISO 8601
	endAt: string;
	timezone: string;
	location?: string | null;
	description?: string | null;
	// RRULE(s) (RFC 5545), ex: ["RRULE:FREQ=WEEKLY;BYDAY=MO"]. Omitir se não repetir.
	recurrence?: string[] | null;
}

export interface CalendarInfo {
	id: string;
	summary: string;
}

export interface CalendarEvent {
	id: string;
	htmlLink: string;
}

// Resumo compacto de um evento existente — usado como contexto pra IA (resolver
// referências em linguagem natural) e como payload de leitura do comando `list`.
export interface CalendarEventSummary {
	id: string;
	calendarId: string;
	// Presente quando o evento é uma instância expandida de um evento recorrente
	// (singleEvents=true) — aponta pro id do evento "mestre" da série.
	recurringEventId: string | null;
	title: string;
	startAt: string; // ISO 8601
	endAt: string; // ISO 8601
	location: string | null;
	description: string | null;
}

// Campos que podem ser alterados num PATCH de modificação — todos opcionais,
// já que só enviamos à Google API (e persistimos localmente) o que de fato mudou.
export interface CalendarEventChanges {
	title?: string;
	startAt?: string;
	endAt?: string;
	timezone?: string;
	location?: string | null;
	description?: string | null;
}

export async function listCalendars(accessToken: string): Promise<CalendarInfo[]> {
	const res = await fetch(`${CALENDAR_BASE_URL}/users/me/calendarList`, {
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new Error(`Google Calendar API error: ${res.status} ${await res.text()}`);

	const data = (await res.json()) as { items?: Array<{ id: string; summary?: string }> };
	return (data.items ?? []).map((item) => ({ id: item.id, summary: item.summary ?? item.id }));
}

export async function createCalendarEvent(
	accessToken: string,
	event: CalendarEventInput,
	calendarId = 'primary'
): Promise<CalendarEvent> {
	return callCalendarApi(eventsUrl(calendarId), accessToken, 'POST', toGoogleEventBody(event));
}

export async function updateCalendarEvent(
	accessToken: string,
	googleEventId: string,
	changes: CalendarEventChanges,
	calendarId = 'primary'
): Promise<CalendarEvent> {
	return callCalendarApi(
		`${eventsUrl(calendarId)}/${googleEventId}`,
		accessToken,
		'PATCH',
		toGooglePatchBody(changes)
	);
}

export async function deleteCalendarEvent(
	accessToken: string,
	googleEventId: string,
	calendarId = 'primary'
): Promise<void> {
	const res = await fetch(`${eventsUrl(calendarId)}/${googleEventId}`, {
		method: 'DELETE',
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok && res.status !== 404) {
		throw new Error(`Google Calendar API error: ${res.status} ${await res.text()}`);
	}
}

async function listEventsForCalendar(
	accessToken: string,
	calendarId: string,
	timeMin: string,
	timeMax: string
): Promise<CalendarEventSummary[]> {
	const url = new URL(eventsUrl(calendarId));
	url.searchParams.set('timeMin', timeMin);
	url.searchParams.set('timeMax', timeMax);
	url.searchParams.set('singleEvents', 'true');
	url.searchParams.set('orderBy', 'startTime');

	const res = await fetch(url, {
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new Error(`Google Calendar API error: ${res.status} ${await res.text()}`);

	const data = (await res.json()) as {
		items?: Array<{
			id: string;
			recurringEventId?: string;
			summary?: string;
			location?: string;
			description?: string;
			start?: { dateTime?: string; date?: string };
			end?: { dateTime?: string; date?: string };
		}>;
	};

	return (data.items ?? []).map((item) => ({
		id: item.id,
		calendarId,
		recurringEventId: item.recurringEventId ?? null,
		title: item.summary ?? '(sem título)',
		startAt: item.start?.dateTime ?? item.start?.date ?? '',
		endAt: item.end?.dateTime ?? item.end?.date ?? '',
		location: item.location ?? null,
		description: item.description ?? null
	}));
}

// Busca eventos entre timeMin/timeMax em uma ou mais agendas (usado tanto pro
// comando `list` quanto como contexto pra IA resolver referências em
// linguagem natural a eventos existentes nos comandos `modify`/`delete`/`respond`).
// Sem `calendarIds`, busca só a agenda `primary` (comportamento original,
// mantido como default pra não quebrar chamadas existentes).
export async function listCalendarEvents(
	accessToken: string,
	timeMin: string,
	timeMax: string,
	calendarIds: string[] = ['primary']
): Promise<CalendarEventSummary[]> {
	const perCalendar = await Promise.all(
		calendarIds.map((calendarId) =>
			listEventsForCalendar(accessToken, calendarId, timeMin, timeMax)
		)
	);
	return perCalendar.flat().sort((a, b) => a.startAt.localeCompare(b.startAt));
}

// Responde a um convite (aceitar/recusar/talvez) — a Google Calendar API não
// tem endpoint dedicado pra isso: é um PATCH no array `attendees`, achando a
// entrada cujo email é o do próprio usuário e trocando o `responseStatus`.
export async function respondToCalendarEvent(
	accessToken: string,
	calendarId: string,
	googleEventId: string,
	userEmail: string,
	response: 'accepted' | 'declined' | 'tentative'
): Promise<CalendarEvent> {
	const getRes = await fetch(`${eventsUrl(calendarId)}/${googleEventId}`, {
		headers: { authorization: `Bearer ${accessToken}` }
	});
	if (!getRes.ok) {
		throw new Error(`Google Calendar API error: ${getRes.status} ${await getRes.text()}`);
	}

	const eventData = (await getRes.json()) as {
		attendees?: Array<Record<string, unknown> & { email: string; responseStatus?: string }>;
	};
	const attendees = eventData.attendees ?? [];
	const attendee = attendees.find((a) => a.email.toLowerCase() === userEmail.toLowerCase());
	if (!attendee) throw new Error('Você não está na lista de convidados deste evento.');
	attendee.responseStatus = response;

	return callCalendarApi(`${eventsUrl(calendarId)}/${googleEventId}`, accessToken, 'PATCH', {
		attendees
	});
}

function toGoogleEventBody(event: CalendarEventInput) {
	return {
		summary: event.title,
		location: event.location ?? undefined,
		description: event.description ?? undefined,
		start: { dateTime: event.startAt, timeZone: event.timezone },
		end: { dateTime: event.endAt, timeZone: event.timezone },
		recurrence: event.recurrence ?? undefined
	};
}

// PATCH parcial: só inclui no corpo os campos que de fato mudaram (Google
// Calendar API já suporta PATCH parcial nativamente).
function toGooglePatchBody(changes: CalendarEventChanges) {
	const body: Record<string, unknown> = {};
	if (changes.title !== undefined) body.summary = changes.title;
	if (changes.location !== undefined) body.location = changes.location ?? null;
	if (changes.description !== undefined) body.description = changes.description ?? null;
	if (changes.startAt !== undefined) {
		body.start = { dateTime: changes.startAt, timeZone: changes.timezone };
	}
	if (changes.endAt !== undefined) {
		body.end = { dateTime: changes.endAt, timeZone: changes.timezone };
	}
	return body;
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
