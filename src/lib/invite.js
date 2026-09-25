// Invitations par WhatsApp / SMS : lien de l'événement + message pré-rempli.
// Le message part du téléphone de la personne qui invite (gratuit, personnel, pas de RGPD côté serveur).

const PROD_URL = "https://spritz-connection.vercel.app";

// Dans l'app Android (Capacitor) l'origine est locale : on partage toujours l'adresse publique.
export function appUrl(path = "/") {
  const origin = window.location.origin;
  const base = origin.startsWith("https://") ? origin : PROD_URL;
  return base + path;
}

export function eventInviteUrl(eventId, token) {
  return appUrl(`/event/${eventId}${token ? `?invite=${encodeURIComponent(token)}` : ""}`);
}

export function inviteMessage(event, url) {
  const when = event?.event_date
    ? new Date(event.event_date).toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";
  return `Ciao ! 🍹 Je t'invite à « ${event?.title || "une soirée Spritz Connection"} »${when ? ` — ${when}` : ""}. Toutes les infos et l'inscription ici : ${url}`;
}

export function whatsappLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// "sms:?&body=" est la forme qui marche à la fois sur iPhone et sur Android
export function smsLink(text) {
  return `sms:?&body=${encodeURIComponent(text)}`;
}
