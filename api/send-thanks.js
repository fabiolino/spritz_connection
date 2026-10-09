// Message de remerciement envoyé automatiquement après chaque événement
// (avec le lien vers les avis Google). Appelé une fois par jour par la tâche planifiée Vercel
// déclarée dans vercel.json ("crons"). Accès réservé : Vercel envoie
// "Authorization: Bearer <CRON_SECRET>" automatiquement.
//
// Règles :
//   - événements commencés il y a plus de 10 h (donc terminés) et il y a moins de 4 jours
//   - une seule fois par personne et par événement (colonne registrations.thanks_sent_at)
//   - inscriptions payées, réservées via lien externe, ou gratuites
//   - jamais pour les personnes désinscrites (newsletter_optouts)
//   - ?dry=1 : liste ce qui serait envoyé, sans rien envoyer
//   - ?event=<id> : limite à un événement

import { createClient } from "@supabase/supabase-js";
import { buildThanksEmail, sendViaBrevo } from "./_email.js";
import { addToSpritzList, unsubscribeUrl } from "./_brevo.js";

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MAX_PER_RUN = 150;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  const dry = req.query?.dry === "1";
  const onlyEvent = req.query?.event ? String(req.query.event) : null;

  try {
    const now = Date.now();
    const from = new Date(now - 4 * 24 * 3600 * 1000).toISOString();
    const to = new Date(now - 10 * 3600 * 1000).toISOString();

    let evQuery = supabaseAdmin.from("events").select("id, title, event_date").gte("event_date", from).lte("event_date", to);
    if (onlyEvent) evQuery = evQuery.eq("id", onlyEvent);
    const { data: events, error: evErr } = await evQuery;
    if (evErr) throw evErr;
    if (!events || events.length === 0) return res.status(200).json({ events: 0, sent: 0 });

    const { data: optouts } = await supabaseAdmin.from("newsletter_optouts").select("email");
    const blocked = new Set((optouts || []).map((o) => o.email));

    const summary = [];
    let sent = 0;
    let budget = MAX_PER_RUN;

    for (const event of events) {
      if (budget <= 0) break;
      const { data: regs, error } = await supabaseAdmin
        .from("registrations")
        .select("id, user_id, guest_name, guest_email")
        .eq("event_id", event.id)
        .is("thanks_sent_at", null)
        .or("paid.eq.true,external.eq.true,amount.eq.0");
      if (error) throw error;

      // Une seule personne = un seul message, même avec plusieurs inscriptions
      const byEmail = new Map();
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
        const entry = byEmail.get(email) || { email, name, hasAccount: false, regIds: [] };
        entry.name = entry.name || name;
        entry.hasAccount = entry.hasAccount || !!reg.user_id;
        entry.regIds.push(reg.id);
        byEmail.set(email, entry);
      }

      let eventSent = 0;
      let eventSkipped = 0;
      const toSend = [];
      for (const person of byEmail.values()) {
        if (blocked.has(person.email)) {
          // Désinscrit : on le marque comme traité pour ne plus y revenir
          if (!dry) await markDone(person.regIds);
          eventSkipped++;
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
              const content = buildThanksEmail({ event, recipientName: person.name, hasAccount: person.hasAccount, recipientEmail: person.email });
              const result = await sendViaBrevo({
                to: person.email,
                toName: person.name,
                ...content,
                unsubscribe: unsubscribeUrl(person.email),
                tag: "remerciement"
              });
              if (result.ok) {
                await markDone(person.regIds);
                await addToSpritzList(supabaseAdmin, { email: person.email, name: person.name });
                eventSent++;
              } else {
                console.error("Remerciement non envoyé:", result.error || result.skipped);
              }
            })
          );
        }
      }
      budget -= batch.length;
      sent += eventSent;
      summary.push({ event: event.title, recipients: byEmail.size, sent: eventSent, optedOut: eventSkipped });
    }

    return res.status(200).json({ dry, events: events.length, sent, summary });
  } catch (err) {
    console.error("Erreur envoi remerciements:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

async function markDone(ids) {
  if (!ids.length) return;
  await supabaseAdmin.from("registrations").update({ thanks_sent_at: new Date().toISOString() }).in("id", ids);
}
