// Ajouter une soirée à l'agenda : Google Agenda, ou fichier .ics (iPhone, Outlook…) servi par l'API.
const DURATION_H = 3;

function stamp(date) {
  return new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(event) {
  const start = new Date(event.event_date);
  const end = new Date(start.getTime() + DURATION_H * 3600 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "Soirée Spritz Connection",
    dates: `${stamp(start)}/${stamp(end)}`,
    details: `Soirée Spritz Connection — ${window.location.origin}/event/${event.id}`,
    location: event.address || ""
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsUrl(eventId) {
  return `/api/event-attendees?ics=${eventId}`;
}
