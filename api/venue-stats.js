// Déploiement Vercel : POST /api/venue-stats
// Traçabilité : pour chaque lieu, combien d'événements et d'inscriptions
// sont passés par l'app. Protégé par ADMIN_SECRET.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { adminSecret } = req.body;
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe administrateur incorrect" });
  }

  try {
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
      return {
        id: v.id,
        name: v.name,
        eventsCount: venueEventIds.length,
        registrationsCount
      };
    });

    return res.status(200).json({ stats });
  } catch (err) {
    console.error("Erreur venue-stats:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
