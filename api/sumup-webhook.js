// Déploiement Vercel : POST /api/sumup-webhook
// À configurer dans le tableau de bord SumUp comme URL de webhook :
//   https://spritz-connection.vercel.app/api/sumup-webhook

import { createClient } from "@supabase/supabase-js";
import { sendRegistrationEmail } from "./_email.js";
import { addTaken, settleReferralOnPaid, sumupCredentials } from "./_registration.js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const checkoutId = req.body?.id;

  if (!checkoutId) {
    return res.status(200).json({ received: true, skipped: "no checkout id" });
  }

  try {
    // Quel compte SumUp a encaissé ce paiement ? (compte du lieu, ou compte de Spritz Connection)
    const { data: known } = await supabaseAdmin
      .from("registrations")
      .select("sumup_account")
      .eq("sumup_checkout_id", checkoutId)
      .maybeSingle();
    const creds = sumupCredentials(known?.sumup_account);
    if (!creds) {
      console.error("Webhook SumUp : compte non configuré pour", known?.sumup_account || "(compte par défaut)");
      return res.status(200).json({ received: true, verified: false });
    }

    const verifyRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${creds.apiKey}` }
    });
    const checkout = await verifyRes.json();

    if (!verifyRes.ok) {
      console.error("Impossible de vérifier le checkout SumUp:", checkout);
      return res.status(200).json({ received: true, verified: false });
    }

    if (checkout.status === "PAID") {
      // Mise à jour conditionnelle : si la page billet a déjà confirmé le paiement,
      // rien ne se passe (la place n'est comptée qu'une seule fois).
      const { data: updated } = await supabaseAdmin
        .from("registrations")
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq("sumup_checkout_id", checkoutId)
        .eq("paid", false)
        .select("id, event_id, quantity, user_id, used_referral_credit");
      const reg = updated && updated[0];

      // Une inscription de groupe occupe autant de places que de personnes
      if (reg && reg.event_id) await addTaken(supabaseAdmin, reg.event_id, reg.quantity || 1);
      if (reg) await settleReferralOnPaid(supabaseAdmin, reg);
      if (reg) await sendRegistrationEmail(supabaseAdmin, reg.id);
    }

    return res.status(200).json({ received: true, status: checkout.status });
  } catch (err) {
    console.error("Erreur webhook SumUp:", err);
    return res.status(200).json({ received: true, error: true });
  }
}
