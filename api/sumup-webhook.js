// Déploiement Vercel : POST /api/sumup-webhook
// À configurer dans le tableau de bord SumUp comme URL de webhook :
//   https://spritz-connection.vercel.app/api/sumup-webhook

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const checkoutId = req.body?.id;

  if
