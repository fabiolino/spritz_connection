// Déploiement Vercel : /api/event-attendees
// Point d'entrée public autour d'un événement (regroupé pour rester sous la limite
// de 12 fonctions serverless du plan Hobby) :
//   POST {eventId}                              → participants inscrits (nom + photo uniquement)
//   POST {action:"invite-preview", eventId, token} → aperçu d'un événement privé pour qui a le lien
//   POST {action:"invite-accept", eventId, token}  → ajoute la personne connectée aux invités
//   GET  ?og=1&id=…[&invite=…]                   → page d'aperçu pour WhatsApp, Messenger, etc.
//        (vercel.json y redirige uniquement les robots de prévisualisation)
//   GET  ?unsubscribe=1&e=…&t=…                 → désinscription de la liste « Spritz Connection »
//   POST {action:"subscribe-self"} + jeton        → ajoute le membre connecté à la liste Brevo

import { createClient } from "@supabase/supabase-js";
import { addToSpritzList, checkUnsubscribeSignature, unsubscribe } from "./_brevo.js";
import { buildIcs } from "./_calendar.js";
import { joinWaitlist } from "./_waitlist.js";
import { rateEvent } from "./_ratings.js";
import { announceNewEvents } from "./_announce.js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORY_IMAGES = ["concert", "karaoke", "apero", "diner", "theatre", "danse", "autre"];

async function validToken(eventId, token) {
  if (!eventId || !token) return false;
  const { data } = await supabaseAdmin
    .from("event_invite_tokens")
    .select("token")
    .eq("event_id", eventId)
    .maybeSingle();
  return !!data && data.token === token;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parisDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function renderPreview(req, res) {
  const origin = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
  const { id, invite } = req.query;
  let title = "Spritz Connection";
  let description = "Soirées italiennes à Paris — apéros, concerts, dîners. Inscris-toi en quelques secondes.";
  let image = `${origin}/og/default.jpg`;
  let url = origin;

  if (id && /^[0-9a-f-]{36}$/i.test(String(id))) {
    url = `${origin}/event/${id}${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`;
    const { data: ev } = await supabaseAdmin
      .from("events")
      .select("title, event_date, address, category, visibility, is_free, price_member")
      .eq("id", id)
      .maybeSingle();
    if (ev) {
      const isPrivate = ev.visibility === "private";
      const allowed = !isPrivate || (await validToken(id, invite));
      if (allowed) {
        title = `${isPrivate ? "🔒 " : ""}${ev.title} — Spritz Connection`;
        const place = ev.address ? ev.address.split(",").slice(-1)[0].trim() : "";
        const price = ev.is_free ? "Gratuit" : ev.price_member ? `dès ${Number(ev.price_member)} €` : "";
        description = [parisDate(ev.event_date), place, price].filter(Boolean).join(" · ");
        if (CATEGORY_IMAGES.includes(ev.category)) image = `${origin}/og/${ev.category}.jpg`;
      } else {
        title = "🔒 Invitation privée — Spritz Connection";
        description = "Un événement sur invitation. Ouvre le lien reçu pour voir les détails.";
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Spritz Connection" />
<meta property="og:locale" content="fr_FR" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
</head><body><a href="${escapeHtml(url)}">${escapeHtml(title)}</a></body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).send(html);
}

function unsubscribePage(title, text) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head><body style="margin:0;background:#FFFAF0;font-family:Helvetica,Arial,sans-serif;color:#062B49">
<div style="max-width:440px;margin:60px auto;padding:28px 24px;background:#fff;border-radius:18px;text-align:center;border-bottom:5px solid #F05A19">
<div style="font-size:40px">🍹</div><h1 style="font-size:21px">${title}</h1><p style="font-size:15px;line-height:1.55;color:#5C6B7A">${text}</p>
<a href="/" style="display:inline-block;margin-top:10px;color:#F05A19;font-weight:700">Retour à Spritz Connection</a></div></body></html>`;
}

export default async function handler(req, res) {
  if (req.method === "GET" && req.query?.unsubscribe) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const email = String(req.query.e || "").trim().toLowerCase();
    if (!email || !checkUnsubscribeSignature(email, String(req.query.t || ""))) {
      return res.status(400).send(unsubscribePage("Lien invalide", "Ce lien de désinscription n'est pas valide. Réponds simplement à un de nos emails pour être retiré·e de la liste."));
    }
    try {
      await unsubscribe(supabaseAdmin, email);
      return res.status(200).send(unsubscribePage("C'est fait.", `${email} ne recevra plus nos actualités. Tu recevras seulement tes billets si tu t'inscris à une soirée. A presto !`));
    } catch (err) {
      console.error("Erreur désinscription:", err);
      return res.status(500).send(unsubscribePage("Oups", "La désinscription n'a pas abouti, réessaie dans un instant."));
    }
  }

  // Fichier agenda (.ics) d'une soirée : iPhone, Outlook, etc.
  if (req.method === "GET" && req.query?.ics) {
    const id = String(req.query.ics);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).send("Lien invalide");
    const { data: ev } = await supabaseAdmin.from("events").select("id, title, event_date, address, approved").eq("id", id).maybeSingle();
    if (!ev || !ev.approved) return res.status(404).send("Soirée introuvable");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="spritz-connection.ics"`);
    res.setHeader("Cache-Control", "public, s-maxage=300");
    return res.status(200).send(buildIcs(ev));
  }

  if (req.method === "GET" && req.query?.og) {
    try {
      return await renderPreview(req, res);
    } catch (err) {
      console.error("Erreur aperçu OG:", err);
      return res.status(200).send("<!DOCTYPE html><title>Spritz Connection</title>");
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { eventId, action, token } = req.body || {};

  // Annonce des nouvelles soirées par email (appelé toutes les heures par Supabase pg_cron)
  if (action === "announce") {
    try {
      const { data: setting } = await supabaseAdmin.from("app_settings").select("value").eq("key", "announce_secret").maybeSingle();
      if (!setting?.value || req.body.secret !== setting.value) return res.status(401).json({ error: "Non autorisé" });
      const result = await announceNewEvents(supabaseAdmin, { dry: !!req.body.dry });
      return res.status(200).json({ ok: true, result });
    } catch (err) {
      console.error("Erreur annonce:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  // Inscription depuis le site spritzconnection.fr (formulaire « newsletter ») à la liste Brevo
  if (action === "site-subscribe") {
    const email = String((req.body || {}).email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return res.status(400).json({ error: "Adresse email invalide" });
    try {
      const ok = await addToSpritzList(supabaseAdmin, { email, name: null });
      return res.status(200).json({ ok });
    } catch (err) {
      console.error("Erreur inscription site:", err);
      return res.status(200).json({ ok: false });
    }
  }

  // Liste d'attente d'une soirée complète
  if (action === "waitlist-join") {
    try {
      const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const { data: userData } = jwt ? await supabaseAdmin.auth.getUser(jwt) : { data: null };
      const b = req.body || {};
      const result = await joinWaitlist(supabaseAdmin, { eventId, userId: userData?.user?.id, name: b.name, email: b.email, phone: b.phone, quantity: b.quantity });
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(200).json(result);
    } catch (err) {
      console.error("Erreur liste d'attente:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  // Note de la soirée (lien de l'email de remerciement)
  if (action === "rate") {
    try {
      const b = req.body || {};
      const result = await rateEvent(supabaseAdmin, { registrationId: b.registrationId, rating: b.rating, comment: b.comment });
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(200).json(result);
    } catch (err) {
      console.error("Erreur note soirée:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  // Espace lieu (/lieu/<token>) : les soirées du lieu et leurs inscrits, sans compte.
  // Le lien privé (venues.access_token) est donné au lieu par l'admin. Jamais l'email des participants.
  if (action === "venue-space") {
    try {
      const tok = String(token || "").trim();
      if (!/^[0-9a-f]{16,64}$/.test(tok)) return res.status(404).json({ error: "Lien invalide" });
      const { data: venue } = await supabaseAdmin
        .from("venues")
        .select("id, name, address")
        .eq("access_token", tok)
        .maybeSingle();
      if (!venue) return res.status(404).json({ error: "Lien invalide ou désactivé" });

      const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
      const { data: events } = await supabaseAdmin
        .from("events")
        .select("id, title, event_date, seats, taken")
        .eq("venue_id", venue.id)
        .eq("approved", true)
        .gte("event_date", since)
        .order("event_date", { ascending: true });

      const out = [];
      for (const ev of events || []) {
        const { data: regs } = await supabaseAdmin
          .from("registrations")
          .select("id, user_id, guest_name, guest_phone, quantity, attendee_names, amount, paid, external, created_at")
          .eq("event_id", ev.id)
          .or("paid.eq.true,external.eq.true")
          .order("created_at", { ascending: true });
        const list = regs || [];
        const userIds = [...new Set(list.map((r) => r.user_id).filter(Boolean))];
        const names = {};
        if (userIds.length) {
          const { data: profs } = await supabaseAdmin.from("profiles").select("id, name, email").in("id", userIds);
          (profs || []).forEach((p) => (names[p.id] = p.name || (p.email ? p.email.split("@")[0] : null)));
        }
        const regIds = list.map((r) => r.id);
        const opts = {};
        if (regIds.length) {
          const { data: o } = await supabaseAdmin.from("registration_options").select("registration_id, label, quantity").in("registration_id", regIds);
          (o || []).forEach((x) => (opts[x.registration_id] = opts[x.registration_id] || []).push(`${(x.quantity || 1) > 1 ? `${x.quantity} × ` : ""}${x.label}`));
        }
        const { data: firsts } = await supabaseAdmin.rpc("sc_first_timers", { p_event: ev.id });
        const firstSet = new Set((firsts || []).map((f) => f.registration_id));
        const participants = list.map((r) => {
          const total = Math.round((Number(r.amount) || 0) * 100) / 100;
          const paid = total > 0 && r.paid ? total : 0;
          return {
            name: r.guest_name || names[r.user_id] || "—",
            phone: r.guest_phone || null,
            quantity: r.quantity || 1,
            with: r.attendee_names || [],
            detail: opts[r.id] || [],
            status: total === 0 ? "Gratuit" : r.paid ? "Réglé en prévente" : "À régler sur place",
            paid,
            due: total - paid,
            firstTime: firstSet.has(r.id),
            at: r.created_at
          };
        });
        out.push({
          id: ev.id,
          title: ev.title,
          event_date: ev.event_date,
          seats: ev.seats,
          places: participants.reduce((n, p) => n + p.quantity, 0),
          newcomers: participants.filter((p) => p.firstTime).length,
          paid: participants.reduce((n, p) => n + p.paid, 0),
          due: participants.reduce((n, p) => n + p.due, 0),
          participants
        });
      }
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ venue: { name: venue.name, address: venue.address }, events: out });
    } catch (err) {
      console.error("Erreur espace lieu:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  if (action === "subscribe-self") {
    try {
      const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const { data: userData } = jwt ? await supabaseAdmin.auth.getUser(jwt) : { data: null };
      const user = userData?.user;
      if (!user?.email) return res.status(401).json({ error: "Non connecté" });
      const { data: profile } = await supabaseAdmin.from("profiles").select("name").eq("id", user.id).maybeSingle();
      const ok = await addToSpritzList(supabaseAdmin, { email: user.email, name: profile?.name });
      return res.status(200).json({ ok });
    } catch (err) {
      console.error("Erreur subscribe-self:", err);
      return res.status(200).json({ ok: false });
    }
  }

  if (!eventId) {
    return res.status(400).json({ error: "eventId manquant" });
  }

  try {
    if (action === "invite-preview") {
      if (!(await validToken(eventId, token))) {
        return res.status(404).json({ error: "Lien d'invitation invalide ou expiré" });
      }
      const { data: ev } = await supabaseAdmin
        .from("events")
        .select("id, title, organizer, description, event_date, address, category, is_free, price_member, price_nonmember, seats, taken, visibility")
        .eq("id", eventId)
        .maybeSingle();
      if (!ev) return res.status(404).json({ error: "Événement introuvable" });
      return res.status(200).json({ event: ev });
    }

    if (action === "invite-accept") {
      if (!(await validToken(eventId, token))) {
        return res.status(404).json({ error: "Lien d'invitation invalide ou expiré" });
      }
      const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const { data: userData } = jwt ? await supabaseAdmin.auth.getUser(jwt) : { data: null };
      const userId = userData?.user?.id;
      if (!userId) return res.status(401).json({ error: "Connecte-toi pour accepter l'invitation" });

      const { data: blocked } = await supabaseAdmin
        .from("event_blocks")
        .select("id")
        .eq("event_id", eventId)
        .eq("blocked_user_id", userId)
        .maybeSingle();
      if (blocked) return res.status(403).json({ error: "Cette invitation n'est pas disponible pour ton compte." });

      const { error } = await supabaseAdmin
        .from("event_invites")
        .upsert({ event_id: eventId, invited_user_id: userId, via_link: true }, { onConflict: "event_id,invited_user_id", ignoreDuplicates: true });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    // Par défaut : participants de l'événement.
    // Comptés : paiements confirmés, inscriptions gratuites et réservations par lien externe
    // (les paiements intégrés abandonnés ne comptent pas).
    // Affichés : nom + photo pour les comptes ; prénom seulement pour les inscrits sans compte
    // et leurs accompagnants (jamais le nom de famille, l'email ni le téléphone).
    const { data: regs, error } = await supabaseAdmin
      .from("registrations")
      .select("user_id, guest_name, quantity, attendee_names, created_at")
      .eq("event_id", eventId)
      .or("paid.eq.true,external.eq.true")
      .order("created_at", { ascending: true })
      .limit(300);

    if (error) throw error;

    const total = (regs || []).reduce((sum, r) => sum + (r.quantity || 1), 0);
    const userIds = [...new Set((regs || []).map((r) => r.user_id).filter(Boolean))];
    let profilesById = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profError } = await supabaseAdmin
        .from("profiles")
        .select("id, name, email, photo_url, is_ambassador, crew_of_month_until")
        .in("id", userIds);
      if (profError) throw profError;
      (profiles || []).forEach((p) => (profilesById[p.id] = p));
    }

    const firstName = (full) => {
      const w = String(full || "").trim().split(/\s+/)[0] || "";
      return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "";
    };

    const attendees = [];
    const seenUsers = new Set();
    for (const r of regs || []) {
      if (r.user_id) {
        if (!seenUsers.has(r.user_id)) {
          seenUsers.add(r.user_id);
          const p = profilesById[r.user_id];
          attendees.push({
            name: p?.name || p?.email?.split("@")[0] || "Participant",
            photo_url: p?.photo_url || null,
            crew: !!p?.is_ambassador,
            crewOfMonth: !!p?.crew_of_month_until && new Date(p.crew_of_month_until) > new Date()
          });
        }
      } else if (r.guest_name) {
        attendees.push({ name: firstName(r.guest_name), photo_url: null });
      }
      (r.attendee_names || []).forEach((n) => {
        const f = firstName(n);
        if (f) attendees.push({ name: f, photo_url: null });
      });
    }

    return res.status(200).json({ attendees: attendees.slice(0, 60), total });
  } catch (err) {
    console.error("Erreur event-attendees:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
