// Déploiement Vercel : POST /api/create-sumup-checkout
//
// Variables d'environnement nécessaires (Vercel > Settings > Environment Variables) :
//   SUMUP_API_KEY              -> clé API secrète SumUp (me.sumup.com > Developers)
//   SUMUP_MERCHANT_CODE        -> code marchand SumUp
//   PUBLIC_APP_URL             -> URL de l'app déployée
//   VITE_SUPABASE_URL          -> URL du projet Supabase (déjà utilisée côté front)
//   SUPABASE_SERVICE_ROLE_KEY  -> clé secrète Supabase (Project Settings > API Keys >
//                                 onglet "Legacy anon, service_role API keys" > service_role)
//                                 ⚠️ Ne JAMAIS préfixer cette variable par VITE_ — elle doit
//                                 rester strictement côté serveur.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { eventId, option, amount, userEmail, userId } = req.body;

  if (!eventId || !option || !amount) {
    return res.status(400).json({ error: "Paramètres manquants (eventId, option, amount)" });
  }

  try {
    if (userId && eventId !== "membership") {
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

    const checkoutReference = `${eventId}-${option}-${Date.now()}`;

    const response = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method:
