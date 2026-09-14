// Déploiement Vercel : POST /api/create-free-event
// Ouvert à tout le monde — aucune protection par mot de passe.
// Les événements créés ici sont en attente de validation (approved: false)
// et n'apparaissent pas sur le feed tant qu'un administrateur ne les a pas approuvés.

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

  const { title, organizer, organizer_contact, description, event_date, address, phone, seats, category } = req.body;

  if (!title || !organizer || !organizer_contact || !event_date || !address || !phone) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }

  try {
    const { latitude, longitude } = await geocodeAddress(address);

    const { data, error } = await supabaseAdmin
      .from("events")
      .insert({
        title,
        organizer,
        organizer_contact,
        description: description || "",
        event_date,
        address,
        phone,
        price_member: 0,
        price_nonmember: 0,
        seats: Number(seats) || 0,
        taken: 0,
        is_free: true,
        approved: false,
        category: category || "autre",
        latitude,
        longitude
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur insertion événement gratuit:", error);
      return res.status(500).json({ error: "Erreur lors de la création de l'événement" });
    }

    return res.status(200).json({ event: data });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
