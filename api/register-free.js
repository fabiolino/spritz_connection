// Déploiement Vercel : POST /api/register-free
// Inscription à un événement gratuit — aucun paiement, juste une place réservée.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { eventId, userId } = req.body;
  if (!eventId) {
    return res.status(400).json({ error: "eventId manquant" });
  }

  try {
    if (userId) {
      const { data: blocked } = await supabaseAdmin
        .from("event_blocks")
        .select("id")
        .eq("event_id", eventId)
        .eq("blocked_user_id", userId)
        .maybeSingle();
      if (blocked) {
        return res.status(403).json({ error: "Tu ne peux pas t'inscrire à cet événement." });
      }
    }

    const { data: event, error:
