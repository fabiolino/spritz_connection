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
