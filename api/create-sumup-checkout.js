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

  const { eventId, option, amount, userEmail } = req.body;

  if (!eventId || !option || !amount) {
    return res.status(400).json({ error: "Paramètres manquants (eventId, option, amount)" });
  }

  try {
    const checkoutReference = `${eventId}-${option}-${Date.now()}`;

    const response = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUMUP_API_KEY}`
      },
      body: JSON.stringify({
        checkout_reference: checkoutReference,
        amount: amount / 100,
        currency: "EUR",
        merchant_code: process.env.SUMUP_MERCHANT_CODE,
        description: `Spritz Connection — ${option}`,
        redirect_url: `${process.env.PUBLIC_APP_URL}/event/${eventId}?paid=1`,
        return_url: `${process.env.PUBLIC_APP_URL}/api/sumup-webhook`,
        hosted_checkout: { enabled: true },
        ...(userEmail ? { customer_id: userEmail } : {})
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erreur SumUp:", data);
      return res.status(response.status).json({ error: data.message || "Échec de création du paiement SumUp" });
    }

    // Enregistre l'inscription en base, en attente de paiement.
    // Le webhook (api/sumup-webhook.js) passera "paid" à true une fois le paiement confirmé.
    const { error: dbError } = await supabaseAdmin.from("registrations").insert({
      event_id: eventId === "membership" ? null : eventId,
      option,
      amount: amount / 100,
      sumup_checkout_id: data.id,
      paid: false
    });

    if (dbError) {
      // On log l'erreur mais on ne bloque pas le paiement pour autant —
      // le webhook pourra quand même confirmer côté SumUp même si cette
      // ligne n'a pas pu être créée (à surveiller dans les logs Vercel).
      console.error("Erreur insertion registration:", dbError);
    }

    const hostedCheckoutUrl = data.hosted_checkout_url;

    if (!hostedCheckoutUrl) {
      console.error("Pas de hosted_checkout_url dans la réponse SumUp:", data);
      return res.status(502).json({ error: "SumUp n'a pas renvoyé d'URL de paiement" });
    }

    return res.status(200).json({
      url: hostedCheckoutUrl,
      checkoutId: data.id,
      checkoutReference
    });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur lors de la création du paiement" });
  }
}
