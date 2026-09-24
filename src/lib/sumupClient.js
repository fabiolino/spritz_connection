// Appelle la fonction serverless Vercel qui crée la transaction SumUp,
// puis redirige l'utilisateur vers la page de paiement hébergée par SumUp.
// Le montant est recalculé côté serveur : on n'envoie que les choix (options, adhésion).

import { supabase } from "./supabaseClient";

export async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function startCheckout({ eventId, option, selectedOptionIds }) {
  const res = await fetch("/api/create-sumup-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ eventId, option, selectedOptionIds: selectedOptionIds || [] })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Échec de la création du paiement");
  }

  const { url } = await res.json();
  window.location.href = url; // redirection vers la page de paiement SumUp
}
