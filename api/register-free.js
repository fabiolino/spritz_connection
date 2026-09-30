// Déploiement Vercel : POST /api/register-free
// Inscription à un événement gratuit — aucun paiement, juste des places réservées.
// Possible sans compte (prénom + nom obligatoires) et pour un groupe (quantity personnes,
// un seul billet avec un code à montrer à l'entrée).

import { createClient } from "@supabase/supabase-js";
import { parseQuantity, readGuest, readAttendeeNames, seatsError, insertRegistration, addTaken } from "./_registration.js";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  if (req.body?.action === "cancel") {
    return handleCancel(req, res);
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
      option: "gratuit",
      amount: 0,
      paid: true,
      paid_at: new Date().toISOString()
    });

    await addTaken(supabaseAdmin, eventId, quantity);

    return res.status(200).json({ ok: true, registrationId: reg.id, quantity });
  } catch (err) {
    console.error("Erreur inscription gratuite:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
