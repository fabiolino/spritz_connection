// Récapitulatif pour les lieux, LA VEILLE de l'événement à 14 h (heure de Paris) — tâche planifiée Vercel
// (vercel.json "crons"). Chaque lieu reçoit la liste à jour des participants de ses événements du lendemain :
// prénom/nom, mobile, places, montant réglé en prévente, montant à régler sur place, pour organiser la cuisine.
// Jamais l'email des participants. Les inscriptions suivantes sont envoyées au fur et à mesure, avec le
// tableau à jour (api/_notify.js).
//
// Vercel planifie en UTC : deux déclenchements (12 h et 13 h UTC) et ce code n'envoie que
// lorsqu'il est 14 h à Paris (été comme hiver). Un événement n'est récapitulé qu'une fois
// (clé venue_recap:<id>:<jour> dans private_config).
// Accès réservé : Vercel envoie "Authorization: Bearer <CRON_SECRET>".
//   ?dry=1   : montre ce qui serait envoyé, sans rien envoyer
//   ?force=1 : ignore l'heure (test manuel, avec le secret)

import { createClient } from "@supabase/supabase-js";
import { sendViaBrevo } from "./_email.js";
import { buildVenueRecap, loadEventRows, parisParts, parisTomorrow, RECAP_HOUR } from "./_notify.js";

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
    // Événements dont le jour (Paris) est DEMAIN : fenêtre large puis filtre précis
    const from = new Date(Date.now()).toISOString();
    const to = new Date(Date.now() + 60 * 3600 * 1000).toISOString();
    const { data: events } = await supabaseAdmin
      .from("events")
      .select("id, title, event_date, venue_id")
      .eq("approved", true)
      .not("venue_id", "is", null)
      .gte("event_date", from)
      .lte("event_date", to);
    const tomorrowDay = parisTomorrow();
    const tomorrow = (events || []).filter((e) => parisParts(new Date(e.event_date)).day === tomorrowDay);

    const out = { day: now.day, eventsDay: tomorrowDay, dry, events: [] };
    for (const event of tomorrow) {
      const key = `venue_recap:${event.id}`;
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
