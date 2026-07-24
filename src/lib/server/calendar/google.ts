// Implementação do CalendarProvider (ver ./provider.ts) sobre a Google
// Calendar API. As funções de fato vivem em $lib/server/google/calendar.ts
// (nome já usado em código existente e testes) — este arquivo só as agrupa no
// formato de objeto que satisfaz a interface, e o `satisfies` abaixo garante
// em tempo de compilação que continuam batendo se qualquer uma mudar de
// assinatura.
import {
	listCalendars,
	listCalendarEvents,
	createCalendarEvent,
	updateCalendarEvent,
	deleteCalendarEvent,
	respondToCalendarEvent
} from '../google/calendar';
import type { CalendarProvider } from './provider';

export const googleCalendarProvider = {
	listCalendars,
	listEvents: listCalendarEvents,
	createEvent: createCalendarEvent,
	updateEvent: updateCalendarEvent,
	deleteEvent: deleteCalendarEvent,
	respondToEvent: respondToCalendarEvent
} satisfies CalendarProvider;
