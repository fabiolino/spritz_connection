// Déploiement Vercel : POST /api/set-member-status
// Protégé par ADMIN_SECRET — active ou désactive le statut membre d'un profil.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { adminSecret, profileId, isMember, isAmbassador } = req.body;
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe administrateur incorrect" });
  }
  if (!profileId || (typeof isMember !== "boolean" && typeof isAmbassador !== "boolean")) {
    return res.status(400).json({ error: "Paramètres invalides" });
  }

  try {
    // Statut membre et/ou ambassadeur Spritz Crew
    const patch = {};
    if (typeof isMember === "boolean") patch.is_member = isMember;
    if (typeof isAmbassador === "boolean") patch.is_ambassador = isAmbassador;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", profileId);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erreur mise à jour statut membre:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
