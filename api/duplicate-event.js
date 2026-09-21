// Déploiement Vercel : POST /api/duplicate-event
// Duplique un événement existant à une nouvelle date (pratique pour les soirées récurrentes).
// Copie aussi ses options éventuelles. Protégé par ADMIN_SECRET.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { adminSecret, eventId, newDate } = req.body;

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe administrateur incorrect" });
  }
  if (!eventId || !newDate) {
    return res.status(400).json({ error: "eventId et newDate requis" });
  }

  try {
    const { data: original, error: fetchError } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (fetchError || !original) {
      return res.status(404).json({ error: "Événement introuvable" });
    }

    const { id, taken, created_at, ...rest } = original;

    const { data: copy, error: insertError } = await supabaseAdmin
      .from("events")
      .insert({ ...rest, event_date: newDate, taken: 0 })
      .select()
      .single();

    if (insertError) {
      console.error("Erreur duplication événement:", insertError);
      return res.status(500).json({ error: "Erreur lors de la duplication" });
    }

    const { data: originalOptions } = await supabaseAdmin
      .from("event_options")
      .select("label, price")
      .eq("event_id", eventId);

    if (originalOptions && originalOptions.length > 0) {
      const rows = originalOptions.map((o) => ({ event_id: copy.id, label: o.label, price: o.price }));
      await supabaseAdmin.from("event_options").insert(rows);
    }

    return res.status(200).json({ event: copy });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
