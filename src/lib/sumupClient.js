// Appelle la fonction serverless Vercel qui crée la transaction SumUp,
// puis redirige l'utilisateur vers la page de paiement hébergée par SumUp.
// Le montant est recalculé côté serveur : on n'envoie que les choix (options, adhésion).

import { supabase } from "./supabaseClient";

export async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// extra : { quantity, attendeeNames, optionQuantities, guestName, guestEmail, guestPhone }
export async function startCheckout({ eventId, option, selectedOptionIds, ...extra }) {
  const res = await fetch("/api/create-sumup-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ eventId, option, selectedOptionIds: selectedOptionIds || [], ...extra })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Échec de la création du paiement");
  }

  const data = await res.json();

  // Entrée gratuite de parrainage : pas de paiement, direction le billet
  if (data.free) {
    window.location.href = `/ticket/${data.registrationId}`;
    return;
  }

  window.location.href = data.url; // redirection vers la page de paiement SumUp
}
