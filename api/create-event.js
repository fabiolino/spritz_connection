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
        price_nonmember:
