// Déploiement Vercel : POST /api/event-attendees
// Renvoie la liste des participants inscrits et payés à un événement
// (nom + photo uniquement — jamais les montants ni infos de paiement).

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { eventId } = req.body;
  if (!eventId) {
    return res.status(400).json({ error: "eventId manquant" });
  }

  try {
    const { data: regs, error } = await supabaseAdmin
      .from("registrations")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("paid", true)
      .not("user_id", "is", null)
      .limit(60);

    if (error) throw error;

    const userIds = [...new Set((regs || []).map((r) => r.user_id))];
    if (userIds.length === 0) {
      return res.status(200).json({ attendees: [] });
    }

    const { data: profiles, error: profError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, photo_url")
      .in("id", userIds);

    if (profError) throw profError;

    const attendees = (profiles || []).map((p) => ({
      name: p.name || p.email?.split("@")[0] || "Participant",
      photo_url: p.photo_url || null
    }));

    return res.status(200).json({ attendees });
  } catch (err) {
    console.error("Erreur liste participants:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
