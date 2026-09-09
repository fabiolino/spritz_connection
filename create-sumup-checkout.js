// Déploiement Vercel : ce fichier devient automatiquement l'endpoint
// POST /api/create-sumup-checkout
//
// Variables d'environnement à ajouter dans Vercel (Settings > Environment Variables) :
//   SUMUP_API_KEY        -> clé API secrète (me.sumup.com > Developers)
//   SUMUP_MERCHANT_CODE  -> ton code marchand SumUp
//   PUBLIC_APP_URL       -> l'URL de ton app déployée

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
        ...(userEmail ? { customer_id: userEmail } : {})
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erreur SumUp:", data);
      return res.status(response.status).json({ error: data.message || "Échec de création du paiement SumUp" });
    }

    const hostedCheckoutUrl = `https://pay.sumup.com/b2c/${data.id}`;

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
