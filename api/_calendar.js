// Ajout d'une soirée à l'agenda du téléphone : lien Google Agenda + fichier .ics (iPhone, Outlook…).
// Pas une fonction serverless (le "_" l'exclut).

export const DEFAULT_DURATION_H = 3;

function appUrl() {
  return (process.env.PUBLIC_APP_URL || "https://spritz-connection.vercel.app").replace(/\/$/, "");
}

// 2026-10-22T16:00:00Z -> 20261022T160000Z
function stamp(date) {
  return new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(event, { ticketUrl } = {}) {
  const start = new Date(event.event_date);
  const end = new Date(start.getTime() + DEFAULT_DURATION_H * 3600 * 1000);
  const details = [`Soirée Spritz Connection.`, ticketUrl ? `Ton billet : ${ticketUrl}` : `${appUrl()}/event/${event.id}`].join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details,
    location: event.address || ""
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsUrl(eventId) {
  return `${appUrl()}/api/event-attendees?ics=${eventId}`;
}

function icsEscape(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildIcs(event) {
  const start = new Date(event.event_date);
  const end = new Date(start.getTime() + DEFAULT_DURATION_H * 3600 * 1000);
  const url = `${appUrl()}/event/${event.id}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Spritz Connection//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@spritzconnection.fr`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `LOCATION:${icsEscape(event.address)}`,
    `DESCRIPTION:${icsEscape(`Soirée Spritz Connection — ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Ce soir : ${event.title}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}
