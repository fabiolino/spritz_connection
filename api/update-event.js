// Déploiement Vercel : POST /api/update-event
// Modifie un événement existant (correction d'erreur). Protégé par ADMIN_SECRET.
// Remplace entièrement les options de l'événement par celles envoyées.

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
    eventId,
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
    venueId,
    sumupLink,
    options
  } = req.body;

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe administrateur incorrect" });
  }
  if (!eventId || !title || !organizer || !event_date || !address || !phone) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }

  try {
    const { latitude, longitude } = await geocodeAddress(address);

    const { data, error } = await supabaseAdmin
      .from("events")
      .update({
        title,
        organizer,
        description: description || "",
        event_date,
        address,
        phone,
        price_member: Number(price_member) || 0,
        price_nonmember: Number(price_nonmember) || 0,
        seats: Number(seats) || 0,
        category: category || "autre",
        visibility: visibility === "private" ? "private" : "public",
        venue_id: venueId || null,
        sumup_link: sumupLink || null,
        latitude,
        longitude
      })
      .eq("id", eventId)
      .select()
      .single();

    if (error) {
      console.error("Erreur mise à jour événement:", error);
      return res.status(500).json({ error: "Erreur lors de la mise à jour" });
    }

    await supabaseAdmin.from("event_options").delete().eq("event_id", eventId);

    if (Array.isArray(options) && options.length > 0) {
      const optionRows = options
        .filter((o) => o.label && o.price !== "")
        .map((o) => ({ event_id: eventId, label: o.label, price: Number(o.price) || 0 }));
      if (optionRows.length > 0) {
        const { error: optionsError } = await supabaseAdmin.from("event_options").insert(optionRows);
        if (optionsError) {
          console.error("Erreur insertion options:", optionsError);
        }
      }
    }

    return res.status(200).json({ event: data });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
