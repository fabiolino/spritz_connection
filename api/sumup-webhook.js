// Déploiement Vercel : POST /api/sumup-webhook
// À configurer dans le tableau de bord SumUp comme URL de webhook :
//   https://spritz-connection.vercel.app/api/sumup-webhook
//
// Principe : SumUp nous notifie qu'un checkout a changé de statut. Plutôt que
// de faire confiance aveuglément au contenu de la notification (SumUp ne la
// signe pas cryptographiquement), on revérifie systématiquement le statut
// réel du paiement directement auprès de l'API SumUp avec notre propre clé
// secrète avant de marquer quoi que ce soit comme payé.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  // Format réel confirmé par la doc SumUp : { "event_type": "CHECKOUT_STATUS_CHANGED", "id": "..." }
  const checkoutId = req.body?.id;

  if (!checkoutId) {
    // On répond 200 quand même pour éviter que SumUp ne re-tente indéfiniment
    // une notification qu'on ne saura de toute façon jamais traiter.
    return res.status(200).json({ received: true, skipped: "no checkout id" });
  }

  try {
    // Revérification directe auprès de SumUp — source de vérité.
    const verifyRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${process.env.SUMUP_API_KEY}` }
    });
    const checkout = await verifyRes.json();

    if (!verifyRes.ok) {
      console.error("Impossible de vérifier le checkout SumUp:", checkout);
      return res.status(200).json({ received: true, verified: false });
    }

    if (checkout.status === "PAID") {
      const { error } = await supabaseAdmin
        .from("registrations")
        .update({ paid: true })
        .eq("sumup_checkout_id", checkoutId);

      if (error) {
        console.error("Erreur mise à jour registration:", error);
      }
    }

    // Toujours répondre 200 rapidement — SumUp attend un accusé de réception,
    // pas une confirmation de ce qu'on en a fait.
    return res.status(200).json({ received: true, status: checkout.status });
  } catch (err) {
    console.error("Erreur webhook SumUp:", err);
    return res.status(200).json({ received: true, error: true });
  }
}
