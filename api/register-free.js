// Déploiement Vercel : POST /api/register-free
// Inscription à un événement gratuit — aucun paiement, juste des places réservées.
// Possible sans compte (prénom + nom obligatoires) et pour un groupe (quantity personnes,
// un seul billet avec un code à montrer à l'entrée).

import { createClient } from "@supabase/supabase-js";
import { parseQuantity, readGuest, readAttendeeNames, seatsError, insertRegistration, addTaken, resolveReferrer } from "./_registration.js";
import { sendRegistrationEmail } from "./_email.js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUserFromRequest(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Désinscription en libre-service (soirées gratuites uniquement — pour une soirée payante,
// l'utilisateur doit se rapprocher de l'établissement qui a encaissé le paiement).
async function handleCancel(req, res) {
  const { registrationId } = req.body || {};
  if (!registrationId) return res.status(400).json({ error: "registrationId manquant" });
  try {
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, event_id, quantity, paid, external")
      .eq("id", registrationId)
      .maybeSingle();
    if (!reg) return res.status(404).json({ error: "Inscription introuvable" });

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("is_free, event_date")
      .eq("id", reg.event_id)
      .maybeSingle();
    if (!event) return res.status(404).json({ error: "Événement introuvable" });
    if (!event.is_free) {
      return res.status(400).json({ error: "Cet événement est payant : rapproche-toi directement de l'établissement pour te désinscrire." });
    }
    if (new Date(event.event_date) <= new Date()) {
      return res.status(400).json({ error: "Cet événement a déjà eu lieu." });
    }

    await supabaseAdmin.from("registration_options").delete().eq("registration_id", reg.id);
    const { error: delError } = await supabaseAdmin.from("registrations").delete().eq("id", reg.id);
    if (delError) throw delError;
    await addTaken(supabaseAdmin, reg.event_id, -(reg.quantity || 1));

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erreur désinscription:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}


// --- Report d'une inscription payante vers une autre date ---
// Règles : événement payant, au plus tard 24 h avant le début, vers un événement à venir
// au même tarif (membre et non-membre) et au même endroit (même lieu, ou même adresse).
// Les options choisies (ex. dîner) doivent exister au même prix dans le nouvel événement.
// Le billet garde son code ; il est renvoyé par email avec la nouvelle date.

const RESCHEDULE_MIN_HOURS = 24;

const sameNumber = (a, b) => Math.round((Number(a) || 0) * 100) === Math.round((Number(b) || 0) * 100);
const normAddress = (a) => String(a || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

function samePlace(a, b) {
  if (a.venue_id && b.venue_id) return a.venue_id === b.venue_id;
  return !!normAddress(a.address) && normAddress(a.address) === normAddress(b.address);
}

function sameTariff(a, b) {
  return sameNumber(a.price_member, b.price_member) && sameNumber(a.price_nonmember, b.price_nonmember);
}

const EVENT_FIELDS = "id, title, event_date, address, venue_id, price_member, price_nonmember, is_free, approved, visibility, seats, taken";

// Charge l'inscription et vérifie qu'elle peut être reportée. Renvoie { error, status } ou { reg, event, options }.
async function loadReschedulable(registrationId) {
  if (!registrationId) return { error: "Billet introuvable", status: 400 };
  const { data: reg } = await supabaseAdmin
    .from("registrations")
    .select("id, event_id, user_id, quantity, paid, external")
    .eq("id", registrationId)
    .maybeSingle();
  if (!reg || !reg.event_id) return { error: "Billet introuvable", status: 404 };
  if (!reg.paid && !reg.external) return { error: "Ce billet n'est pas encore payé.", status: 400 };

  const { data: event } = await supabaseAdmin.from("events").select(EVENT_FIELDS).eq("id", reg.event_id).maybeSingle();
  if (!event) return { error: "Événement introuvable", status: 404 };
  if (event.is_free) return { error: "Le report concerne les événements payants. Pour un événement gratuit, annule et réinscris-toi.", status: 400 };

  const hoursLeft = (new Date(event.event_date).getTime() - Date.now()) / 3600000;
  if (hoursLeft < RESCHEDULE_MIN_HOURS) {
    return { error: `Le report n'est possible que jusqu'à ${RESCHEDULE_MIN_HOURS} h avant le début de l'événement.`, status: 400 };
  }

  const { data: options } = await supabaseAdmin
    .from("registration_options")
    .select("label, price, quantity")
    .eq("registration_id", reg.id);
  return { reg, event, options: options || [] };
}

// Événements vers lesquels ce billet peut être reporté
async function eligibleTargets(reg, event, options) {
  const { data: candidates } = await supabaseAdmin
    .from("events")
    .select(EVENT_FIELDS)
    .eq("approved", true)
    .eq("is_free", false)
    .neq("id", event.id)
    .gt("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(200);

  let list = (candidates || []).filter(
    (e) => e.visibility !== "private" && sameTariff(event, e) && samePlace(event, e)
  );
  if (list.length === 0) return [];

  // Les options choisies doivent exister, au même prix, dans le nouvel événement
  if (options.length > 0) {
    const { data: targetOptions } = await supabaseAdmin
      .from("event_options")
      .select("event_id, label, price")
      .in("event_id", list.map((e) => e.id));
    list = list.filter((e) =>
      options.every((o) =>
        (targetOptions || []).some(
          (t) => t.event_id === e.id && normAddress(t.label) === normAddress(o.label) && sameNumber(t.price, o.price)
        )
      )
    );
  }

  // Événements dont la personne a été écartée par l'organisateur
  if (reg.user_id && list.length > 0) {
    const { data: blocks } = await supabaseAdmin
      .from("event_blocks")
      .select("event_id")
      .eq("blocked_user_id", reg.user_id)
      .in("event_id", list.map((e) => e.id));
    const blocked = new Set((blocks || []).map((b) => b.event_id));
    list = list.filter((e) => !blocked.has(e.id));
  }

  const quantity = reg.quantity || 1;
  return list.map((e) => ({
    id: e.id,
    title: e.title,
    event_date: e.event_date,
    address: e.address,
    full: !!seatsError(e, quantity)
  }));
}

async function handleRescheduleOptions(req, res) {
  try {
    const loaded = await loadReschedulable(req.body?.registrationId);
    if (loaded.error) return res.status(200).json({ allowed: false, reason: loaded.error, events: [] });
    const events = await eligibleTargets(loaded.reg, loaded.event, loaded.options);
    return res.status(200).json({
      allowed: true,
      deadline: new Date(new Date(loaded.event.event_date).getTime() - RESCHEDULE_MIN_HOURS * 3600000).toISOString(),
      events
    });
  } catch (err) {
    console.error("Erreur options de report:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

async function handleReschedule(req, res) {
  try {
    const loaded = await loadReschedulable(req.body?.registrationId);
    if (loaded.error) return res.status(loaded.status).json({ error: loaded.error });
    const { reg, event, options } = loaded;
    const targetId = String(req.body?.targetEventId || "");
    const targets = await eligibleTargets(reg, event, options);
    const target = targets.find((e) => e.id === targetId);
    if (!target) {
      return res.status(400).json({ error: "Cet événement n'est pas au même tarif et au même endroit : le report n'y est pas possible." });
    }
    if (target.full) {
      const { data: fresh } = await supabaseAdmin.from("events").select("seats, taken").eq("id", targetId).maybeSingle();
      return res.status(409).json({ error: seatsError(fresh || {}, reg.quantity || 1) || "Cet événement est complet." });
    }

    // Déplacement conditionnel : si le billet a déjà changé d'événement entre-temps, rien ne bouge.
    const { data: moved, error: moveError } = await supabaseAdmin
      .from("registrations")
      .update({ event_id: targetId })
      .eq("id", reg.id)
      .eq("event_id", event.id)
      .select("id");
    if (moveError) throw moveError;
    if (!moved || moved.length === 0) {
      return res.status(409).json({ error: "Ce billet a déjà été modifié. Recharge la page." });
    }

    const quantity = reg.quantity || 1;
    await addTaken(supabaseAdmin, event.id, -quantity);
    await addTaken(supabaseAdmin, targetId, quantity);
    const emailed = await sendRegistrationEmail(supabaseAdmin, reg.id, { force: true });

    return res.status(200).json({ ok: true, event: target, emailed: !!emailed });
  } catch (err) {
    console.error("Erreur report de billet:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  if (req.body?.action === "cancel") {
    return handleCancel(req, res);
  }
  if (req.body?.action === "reschedule-options") {
    return handleRescheduleOptions(req, res);
  }
  if (req.body?.action === "reschedule") {
    return handleReschedule(req, res);
  }

  const { eventId } = req.body || {};
  if (!eventId) {
    return res.status(400).json({ error: "eventId manquant" });
  }

  try {
    // L'identité vient du jeton de connexion (et plus d'un userId envoyé par le navigateur)
    const user = await getUserFromRequest(req);
    let guest = null;
    if (!user) {
      guest = readGuest(req.body);
      if (guest.error) return res.status(400).json({ error: guest.error });
    }
    const quantity = parseQuantity(req.body.quantity);

    if (user) {
      const { data: blocked } = await supabaseAdmin
        .from("event_blocks")
        .select("id")
        .eq("event_id", eventId)
        .eq("blocked_user_id", user.id)
        .maybeSingle();
      if (blocked) {
        return res.status(403).json({ error: "Tu ne peux pas t'inscrire à cet événement." });
      }
    }

    const { data: event, error: fetchError } = await supabaseAdmin
      .from("events")
      .select("seats, taken, is_free, approved")
      .eq("id", eventId)
      .single();

    if (fetchError || !event || !event.approved) {
      return res.status(404).json({ error: "Événement introuvable" });
    }
    if (!event.is_free) {
      return res.status(400).json({ error: "Cet événement est payant." });
    }
    const full = seatsError(event, quantity);
    if (full) return res.status(409).json({ error: full });

    const reg = await insertRegistration(supabaseAdmin, {
      event_id: eventId,
      user_id: user ? user.id : null,
      guest_name: guest?.name || null,
      guest_email: guest?.email || null,
      guest_phone: guest?.phone || null,
      quantity,
      attendee_names: readAttendeeNames(req.body.attendeeNames, quantity),
      referrer_id: await resolveReferrer(supabaseAdmin, req.body.refCode, user?.id),
      option: "gratuit",
      amount: 0,
      paid: true,
      paid_at: new Date().toISOString()
    });

    await addTaken(supabaseAdmin, eventId, quantity);
    const emailed = await sendRegistrationEmail(supabaseAdmin, reg.id);

    return res.status(200).json({ ok: true, registrationId: reg.id, quantity, emailed });
  } catch (err) {
    console.error("Erreur inscription gratuite:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
