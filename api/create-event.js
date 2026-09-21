// Déploiement Vercel : POST /api/create-event
// Endpoint protégé par un mot de passe admin simple (pas d'auth utilisateur pour l'instant).

import { createClient } from "@supabase/supabase-js";
import { geocodeAddress } from "./_geocode.js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const {
    adminSecret,
    title,
    organizer,
    description,
    event_date,
    address,
    phone,
    price_member,
    price_nonmember,
    seats,
    category,
    visibility,
    invitedUserIds
  } = req.body;

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe administrateur incorrect" });
  }

  if (!title || !organizer || !event_date || !address || !phone) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }

  try {
    const { latitude, longitude } = await geocodeAddress(address);

    const { data, error } = await supabaseAdmin
      .from("events")
      .insert({
        title,
        organizer,
        description: description || "",
        event_date,
        address,
        phone,
        price_member: Number(price_member) || 0,
        price_nonmember: Number(price_nonmember) || 0,
        seats: Number(seats) || 0,
        taken: 0,
        category: category || "autre",
        visibility: visibility === "private" ? "private" : "public",
        latitude,
        longitude
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur insertion événement:", error);
      return res.status(500).json({ error: "Erreur lors de la création de l'événement" });
    }

    if (visibility === "private" && Array.isArray(invitedUserIds) && invitedUserIds.length > 0) {
      const rows = invitedUserIds.map((userId) => ({ event_id: data.id, invited_user_id: userId }));
      const { error: inviteError } = await supabaseAdmin.from("event_invites").insert(rows);
      if (inviteError) {
        console.error("Erreur insertion invitations:", inviteError);
      }
    }

    return res.status(200).json({ event: data });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
