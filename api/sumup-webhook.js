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

  if (!checkoutId) {
    return res.status(200).json({ received: true, skipped: "no checkout id" });
  }

  try {
    const verifyRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${process.env.SUMUP_API_KEY}` }
    });
    const checkout = await verifyRes.json();

    if (!verifyRes.ok) {
      console.error("Impossible de vérifier le checkout SumUp:", checkout);
      return res.status(200).json({ received: true, verified: false });
    }

    if (checkout.status === "PAID") {
      const { data: reg, error: regFetchError } = await supabaseAdmin
        .from("registrations")
        .select("id, event_id, paid")
        .eq("sumup_checkout_id", checkoutId)
        .single();

      if (!regFetchError && reg && !reg.paid) {
        await supabaseAdmin.from("registrations").update({ paid: true }).eq("id", reg.id);

        if (reg.event_id) {
          const { data: ev } = await supabaseAdmin.from("events").select("taken").eq("id", reg.event_id).single();
          if (ev) {
            await supabaseAdmin.from("events").update({ taken: ev.taken + 1 }).eq("id", reg.event_id);
          }
        }
      }
    }

    return res.status(200).json({ received: true, status: checkout.status });
  } catch (err) {
    console.error("Erreur webhook SumUp:", err);
    return res.status(200).json({ received: true, error: true });
  }
}
