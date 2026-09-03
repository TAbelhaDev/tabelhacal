// Contrato que qualquer integração de calendário precisa satisfazer. Hoje só
// existe `googleCalendarProvider` (ver ./google.ts), mas o desenho já separa
// "o que o TAbelhaCal precisa de um provedor de calendário" de "como o Google faz
// isso especificamente" — pra quando Apple/Outlook entrarem (ver README/
// ESCOPO.md "outros calendários além do Google"), a expectativa é: um novo
// arquivo nesta pasta implementando esta mesma interface, mais lógica em
// algum lugar decidindo qual provider usar por usuário (hoje isso nem existe
// porque só tem um provider possível).
//
// `accessToken` é passado em toda chamada (em vez de um provider "logado")
// porque o TAbelhaCal já busca/renova o token por request (ver
// $lib/server/google/tokens.ts) — um provider de outra integração deve seguir
// o mesmo padrão de token efêmero por chamada, não guardar estado de sessão.
import type {
	CalendarEvent,
	CalendarEventChanges,
	CalendarEventInput,
	CalendarEventSummary,
	CalendarInfo
} from '../google/calendar';

export interface CalendarProvider {
	listCalendars(accessToken: string): Promise<CalendarInfo[]>;
	listEvents(
		accessToken: string,
		timeMin: string,
		timeMax: string,
		calendarIds?: string[]
	): Promise<CalendarEventSummary[]>;
	createEvent(
		accessToken: string,
		event: CalendarEventInput,
		calendarId?: string
	): Promise<CalendarEvent>;
	updateEvent(
		accessToken: string,
		eventId: string,
		changes: CalendarEventChanges,
		calendarId?: string
	): Promise<CalendarEvent>;
	deleteEvent(accessToken: string, eventId: string, calendarId?: string): Promise<void>;
	respondToEvent(
		accessToken: string,
		calendarId: string,
		eventId: string,
		userEmail: string,
		response: 'accepted' | 'declined' | 'tentative'
	): Promise<CalendarEvent>;
}
