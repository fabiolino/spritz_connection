// Déploiement Vercel : POST /api/manage-guests
// Protégé par ADMIN_SECRET — gère les invitations et exclusions par événement,
// et la traçabilité par lieu (regroupé ici pour rester sous la limite de fonctions
// serverless du plan Hobby).

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { adminSecret, action, eventId, userId, value } = req.body;
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe administrateur incorrect" });
  }

  try {
    if (action === "co-requests-list") {
      const { data, error } = await supabaseAdmin
        .from("co_organizer_requests")
        .select("id, name, note, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return res.status(200).json({ requests: data || [] });
    }

    if (action === "co-request-moderate") {
      const { requestId, decision } = req.body;
      if (!requestId || !["approved", "rejected"].includes(decision)) {
        return res.status(400).json({ error: "Paramètres invalides" });
      }
      const { error } = await supabaseAdmin.from("co_organizer_requests").update({ status: decision }).eq("id", requestId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (action === "tickets") {
      if (!eventId) return res.status(400).json({ error: "eventId manquant" });
      const { data: regs, error: regsError } = await supabaseAdmin
        .from("registrations")
        .select("id, user_id, option, amount, ticket_code, paid, paid_at, created_at, external, guest_name")
        .eq("event_id", eventId)
        .or("paid.eq.true,external.eq.true")
        .order("created_at", { ascending: true });
      if (regsError) throw regsError;
      const regIds = (regs || []).map((r) => r.id);
      const userIds = [...new Set((regs || []).map((r) => r.user_id).filter(Boolean))];
      let optionsByReg = {};
      if (regIds.length > 0) {
        const { data: opts } = await supabaseAdmin
          .from("registration_options")
          .select("registration_id, label")
          .in("registration_id", regIds);
        (opts || []).forEach((o) => {
          (optionsByReg[o.registration_id] = optionsByReg[o.registration_id] || []).push(o.label);
        });
      }
      let profilesById = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabaseAdmin.from("profiles").select("id, name, email").in("id", userIds);
        (profs || []).forEach((p) => (profilesById[p.id] = p));
      }
      return res.status(200).json({
        tickets: (regs || []).map((r) => ({
          id: r.id,
          code: r.ticket_code,
          amount: r.amount,
          option: r.option,
          paid: !!r.paid,
          external: !!r.external,
          name: profilesById[r.user_id]?.name || profilesById[r.user_id]?.email || r.guest_name || "—",
          options: optionsByReg[r.id] || []
        }))
      });
    }

    // Valider (ou annuler) à la main le paiement d'une réservation faite par lien externe
    if (action === "mark-paid") {
      const { registrationId } = req.body;
      if (!registrationId) return res.status(400).json({ error: "registrationId manquant" });
      const paid = !!value;
      const { data: updated, error: updError } = await supabaseAdmin
        .from("registrations")
        .update({ paid, paid_at: paid ? new Date().toISOString() : null })
        .eq("id", registrationId)
        .eq("external", true)
        .eq("paid", !paid)
        .select("id, event_id");
      if (updError) throw updError;
      const reg = updated && updated[0];
      if (reg && reg.event_id) {
        const { data: ev } = await supabaseAdmin.from("events").select("taken").eq("id", reg.event_id).single();
        if (ev) {
          const taken = Math.max(0, (ev.taken || 0) + (paid ? 1 : -1));
          await supabaseAdmin.from("events").update({ taken }).eq("id", reg.event_id);
        }
      }
      return res.status(200).json({ ok: true, changed: !!reg });
    }

    if (action === "venue-stats") {
      const { data: venues, error: venuesError } = await supabaseAdmin.from("venues").select("id, name");
      if (venuesError) throw venuesError;

      const { data: events, error: eventsError } = await supabaseAdmin
        .from("events")
        .select("id, venue_id")
        .not("venue_id", "is", null);
      if (eventsError) throw eventsError;

      const eventIds = events.map((e) => e.id);
      let registrations = [];
      if (eventIds.length > 0) {
        const { data: regs, error: regsError } = await supabaseAdmin
          .from("registrations")
          .select("event_id")
          .in("event_id", eventIds);
        if (regsError) throw regsError;
        registrations = regs;
      }

      const stats = venues.map((v) => {
        const venueEventIds = events.filter((e) => e.venue_id === v.id).map((e) => e.id);
        const registrationsCount = registrations.filter((r) => venueEventIds.includes(r.event_id)).length;
        return { id: v.id, name: v.name, eventsCount: venueEventIds.length, registrationsCount };
      });

      return res.status(200).json({ stats });
    }

    if (!eventId) {
      return res.status(400).json({ error: "eventId manquant" });
    }

    if (action === "list") {
      const { data: invites } = await supabaseAdmin.from("event_invites").select("invited_user_id").eq("event_id", eventId);
      const { data: blocks } = await supabaseAdmin.from("event_blocks").select("blocked_user_id").eq("event_id", eventId);
      return res.status(200).json({
        invited: (invites || []).map((r) => r.invited_user_id),
        blocked: (blocks || []).map((r) => r.blocked_user_id)
      });
    }

    if (action === "set-invite") {
      if (value) {
        await supabaseAdmin.from("event_invites").upsert({ event_id: eventId, invited_user_id: userId }, { onConflict: "event_id,invited_user_id" });
      } else {
        await supabaseAdmin.from("event_invites").delete().eq("event_id", eventId).eq("invited_user_id", userId);
      }
      return res.status(200).json({ ok: true });
    }

    if (action === "set-block") {
      if (value) {
        await supabaseAdmin.from("event_blocks").upsert({ event_id: eventId, blocked_user_id: userId }, { onConflict: "event_id,blocked_user_id" });
      } else {
        await supabaseAdmin.from("event_blocks").delete().eq("event_id", eventId).eq("blocked_user_id", userId);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Action inconnue" });
  } catch (err) {
    console.error("Erreur manage-guests:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
