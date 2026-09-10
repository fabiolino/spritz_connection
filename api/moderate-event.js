// Déploiement Vercel : POST /api/moderate-event
// Protégé par ADMIN_SECRET — approuve ou refuse un événement gratuit en attente.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { adminSecret, eventId, action } = req.body;

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe administrateur incorrect" });
  }
  if (!eventId || !["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Paramètres invalides" });
  }

  try {
    if (action === "approve") {
      const { error } = await supabaseAdmin.from("events").update({ approved: true }).eq("id", eventId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("events").delete().eq("id", eventId);
      if (error) throw error;
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erreur modération événement:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
