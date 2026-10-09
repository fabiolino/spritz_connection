// Emails automatiques liés aux événements — appelé une fois par jour par la tâche planifiée
// Vercel déclarée dans vercel.json ("crons"). Accès réservé : Vercel envoie
// "Authorization: Bearer <CRON_SECRET>" automatiquement.
//
// 1. REMERCIEMENT après l'événement (avec le lien d'avis Google + prochaines soirées)
//    - événements commencés il y a plus de 10 h et il y a moins de 4 jours
//    - une seule fois par personne et par événement (registrations.thanks_sent_at)
// 2. RAPPEL avant l'événement
//    - événements qui commencent dans 48 h à 72 h
//    - une seule fois par inscription (registrations.reminder_sent_at)
//
// Dans les deux cas : inscriptions payées, réservées via lien externe, ou gratuites ;
// jamais pour les personnes désinscrites (newsletter_optouts).
//   ?dry=1     : liste ce qui serait envoyé, sans rien envoyer
//   ?event=<id>: limite à un événement
//   ?only=thanks|reminder : un seul des deux envois

import { createClient } from "@supabase/supabase-js";
import { buildThanksEmail, buildReminderEmail, sendViaBrevo } from "./_email.js";
import { addToSpritzList, unsubscribeUrl } from "./_brevo.js";

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MAX_PER_RUN = 150;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR = 3600 * 1000;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  const dry = req.query?.dry === "1";
  const onlyEvent = req.query?.event ? String(req.query.event) : null;
  const only = req.query?.only ? String(req.query.only) : null;

  try {
    const { data: optouts } = await supabaseAdmin.from("newsletter_optouts").select("email");
    const blocked = new Set((optouts || []).map((o) => o.email));
    const now = Date.now();
    const out = { dry };

    if (only !== "reminder") {
      const nextEvents = await loadNextEvents();
      out.thanks = await runPass({
        kind: "thanks",
        from: new Date(now - 96 * HOUR).toISOString(),
        to: new Date(now - 10 * HOUR).toISOString(),
        column: "thanks_sent_at",
        tag: "remerciement",
        build: (event, person) => buildThanksEmail({ event, recipientName: person.name, hasAccount: person.hasAccount, recipientEmail: person.email, nextEvents: nextEvents.filter((e) => e.id !== event.id) }),
        dry,
        onlyEvent,
        blocked,
        perPerson: true
      });
    }
    if (only !== "thanks") {
      out.reminders = await runPass({
        kind: "reminder",
        from: new Date(now + 48 * HOUR).toISOString(),
        to: new Date(now + 72 * HOUR).toISOString(),
        column: "reminder_sent_at",
        tag: "rappel",
        build: (event, person) => buildReminderEmail({ reg: person.reg, event, recipientName: person.name, recipientEmail: person.email, hasAccount: person.hasAccount }),
        dry,
        onlyEvent,
        blocked,
        perPerson: false
      });
    }
    return res.status(200).json(out);
  } catch (err) {
    console.error("Erreur envoi emails événements:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// Prochains événements publics et validés (2 au plus), pour le mail de remerciement
async function loadNextEvents() {
  const { data } = await supabaseAdmin
    .from("events")
    .select("id, title, event_date, address")
    .eq("approved", true)
    .eq("visibility", "public")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(3);
  return data || [];
}

async function runPass({ from, to, column, tag, build, dry, onlyEvent, blocked, perPerson }) {
  let evQuery = supabaseAdmin.from("events").select("id, title, event_date, address").gte("event_date", from).lte("event_date", to);
  if (onlyEvent) evQuery = evQuery.eq("id", onlyEvent);
  const { data: events, error: evErr } = await evQuery;
  if (evErr) throw evErr;

  const summary = [];
  let sent = 0;
  let budget = MAX_PER_RUN;

  for (const event of events || []) {
    if (budget <= 0) break;
    const { data: regs, error } = await supabaseAdmin
      .from("registrations")
      .select("id, user_id, guest_name, guest_email, ticket_code, quantity")
      .eq("event_id", event.id)
      .is(column, null)
      .or("paid.eq.true,external.eq.true,amount.eq.0");
    if (error) throw error;

    // Remerciement : une seule personne = un seul message, même avec plusieurs inscriptions.
    // Rappel : un message par inscription (chacune a son propre code de billet).
    const byKey = new Map();
    for (const reg of regs || []) {
      let email = reg.guest_email;
      let name = reg.guest_name;
      if (reg.user_id) {
        const { data: profile } = await supabaseAdmin.from("profiles").select("name, email").eq("id", reg.user_id).maybeSingle();
        email = email || profile?.email;
        name = name || profile?.name;
        if (!email) {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(reg.user_id);
          email = u?.user?.email;
        }
      }
      email = String(email || "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) continue;
      const key = perPerson ? email : reg.id;
      const entry = byKey.get(key) || { email, name, hasAccount: false, regIds: [], reg };
      entry.name = entry.name || name;
      entry.hasAccount = entry.hasAccount || !!reg.user_id;
      entry.regIds.push(reg.id);
      byKey.set(key, entry);
    }

    let eventSent = 0;
    let optedOut = 0;
    const toSend = [];
    for (const person of byKey.values()) {
      if (blocked.has(person.email)) {
        if (!dry) await markDone(column, person.regIds);
        optedOut++;
      } else {
        toSend.push(person);
      }
    }
    const batch = toSend.slice(0, Math.max(0, budget));
    if (dry) {
      eventSent = batch.length;
    } else {
      // 6 envois en parallèle pour rester dans le temps imparti
      for (let i = 0; i < batch.length; i += 6) {
        await Promise.all(
          batch.slice(i, i + 6).map(async (person) => {
            const content = build(event, person);
            const result = await sendViaBrevo({
              to: person.email,
              toName: person.name,
              ...content,
              unsubscribe: unsubscribeUrl(person.email),
              tag
            });
            if (result.ok) {
              await markDone(column, person.regIds);
              await addToSpritzList(supabaseAdmin, { email: person.email, name: person.name });
              eventSent++;
            } else {
              console.error(`Email ${tag} non envoyé:`, result.error || result.skipped);
            }
          })
        );
      }
    }
    budget -= batch.length;
    sent += eventSent;
    summary.push({ event: event.title, recipients: byKey.size, sent: eventSent, optedOut });
  }
  return { events: (events || []).length, sent, summary };
}

async function markDone(column, ids) {
  if (!ids.length) return;
  await supabaseAdmin.from("registrations").update({ [column]: new Date().toISOString() }).in("id", ids);
}
