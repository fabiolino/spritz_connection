// Appelle la fonction serverless Vercel qui crée la transaction SumUp,
// puis redirige l'utilisateur vers la page de paiement hébergée par SumUp.

export async function startCheckout({ eventId, option, amount, userEmail, userId }) {
  const res = await fetch("/api/create-sumup-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, option, amount, userEmail, userId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Échec de la création du paiement");
  }

  const { url } = await res.json();
  window.location.href = url; // redirection vers la page de paiement SumUp
}
