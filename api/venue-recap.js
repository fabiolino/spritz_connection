// Récapitulatif du jour J pour les lieux — tâche planifiée Vercel (vercel.json "crons").
// Envoie à 14 h (heure de Paris) à chaque lieu la liste à jour des participants de ses événements
// du jour : prénom/nom, mobile, places, montant réglé en prévente, montant à régler sur place.
// Jamais l'email des participants. Les retardataires sont signalés ensuite un par un (api/_notify.js).
//
// Vercel planifie en UTC : deux déclenchements (12 h et 13 h UTC) et ce code n'envoie que
// lorsqu'il est 14 h à Paris (été comme hiver). Un événement n'est récapitulé qu'une fois par jour
// (clé venue_recap:<id>:<jour> dans private_config).
// Accès réservé : Vercel envoie "Authorization: Bearer <CRON_SECRET>".
//   ?dry=1   : montre ce qui serait envoyé, sans rien envoyer
//   ?force=1 : ignore l'heure (test manuel, avec le secret)

import { createClient } from "@supabase/supabase-js";
import { sendViaBrevo } from "./_email.js";
import { buildVenueRecap, loadEventRows, parisParts, RECAP_HOUR } from "./_notify.js";

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  const dry = req.query?.dry === "1";
  const force = req.query?.force === "1";
  const now = parisParts();
  if (!force && now.hour !== RECAP_HOUR) {
    return res.status(200).json({ skipped: `Il est ${now.hour} h à Paris, envoi à ${RECAP_HOUR} h` });
  }

  try {
    // Événements dont le jour (Paris) est aujourd'hui : fenêtre large puis filtre précis
    const from = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    const to = new Date(Date.now() + 36 * 3600 * 1000).toISOString();
    const { data: events } = await supabaseAdmin
      .from("events")
      .select("id, title, event_date, venue_id")
      .eq("approved", true)
      .not("venue_id", "is", null)
      .gte("event_date", from)
      .lte("event_date", to);
    const today = (events || []).filter((e) => parisParts(new Date(e.event_date)).day === now.day);

    const out = { day: now.day, dry, events: [] };
    for (const event of today) {
      const key = `venue_recap:${event.id}:${now.day}`;
      const { data: done } = await supabaseAdmin.from("private_config").select("key").eq("key", key).maybeSingle();
      if (done && !force) {
        out.events.push({ event: event.title, skipped: "déjà envoyé" });
        continue;
      }
      const { data: venue } = await supabaseAdmin.from("venues").select("name, contact_email").eq("id", event.venue_id).maybeSingle();
      const email = String(venue?.contact_email || "").trim().toLowerCase();
      if (!email) {
        out.events.push({ event: event.title, skipped: "lieu sans adresse email" });
        continue;
      }
      const rows = await loadEventRows(supabaseAdmin, event.id);
      const content = buildVenueRecap({ event, venueName: venue.name, rows });
      if (dry) {
        out.events.push({ event: event.title, to: email, participants: rows.length, subject: content.subject });
        continue;
      }
      const sent = await sendViaBrevo({ to: email, toName: venue.name, ...content, tag: "lieu-recap" });
      if (sent.ok) await supabaseAdmin.from("private_config").upsert({ key, value: new Date().toISOString() });
      out.events.push({ event: event.title, to: email, participants: rows.length, sent: !!sent.ok, error: sent.error });
    }
    return res.status(200).json(out);
  } catch (err) {
    console.error("Erreur récap lieux:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
