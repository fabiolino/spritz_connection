// Déploiement Vercel : POST /api/create-free-event
// Ouvert à tout le monde — aucune protection par mot de passe.
// Permet de proposer un événement gratuit OU un événement payant organisé par
// quelqu'un d'autre que l'administrateur : dans ce cas, un lien de paiement
// externe (sumupLink) est obligatoire, car aucun paiement ne doit transiter
// par le compte SumUp de l'administrateur.
// Les événements créés ici sont en attente de validation (approved: false)
// et n'apparaissent pas sur le feed tant qu'un administrateur ne les a pas approuvés.

import { createClient } from "@supabase/supabase-js";
import { geocodeAddress } from "./_geocode.js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Les champs "datetime-local" du navigateur envoient une heure sans fuseau
// (ex. "2026-10-02T19:00"). Le serveur Vercel tourne en UTC : sans conversion,
// 19:00 était enregistré comme 19:00 UTC, soit 21:00 à Paris.
// On interprète donc toute heure sans fuseau comme une heure de Paris.
function parisOffsetMs(ts) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(new Date(ts));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(ts / 1000) * 1000;
}

function parisToISO(value) {
  if (!value || typeof value !== "string") return value;
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(value)) return value;
  const [datePart, timePart = "00:00"] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  const wallClock = Date.UTC(y, m - 1, d, h || 0, mi || 0);
  let utc = wallClock - parisOffsetMs(wallClock);
  const check = parisOffsetMs(utc);
  if (wallClock - check !== utc) utc = wallClock - check;
  return new Date(utc).toISOString();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const {
    title,
    organizer,
    organizer_contact,
    description,
    event_date,
    address,
    phone,
    seats,
    category,
    price_member,
    price_nonmember,
    sumupLink
  } = req.body;

  if (!title || !organizer || !organizer_contact || !event_date || !address || !phone) {
    return res.status(400).json({ error: "Champs obligatoires manquants" });
  }

  const priceMember = Number(price_member) || 0;
  const priceNonmember = Number(price_nonmember) || 0;
  const isPaid = priceMember > 0 || priceNonmember > 0;

  if (isPaid && !sumupLink) {
    return res.status(400).json({
      error: "Pour un événement payant proposé par un autre organisateur, un lien de paiement est obligatoire."
    });
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
        event_date: parisToISO(event_date),
        address,
        phone,
        price_member: isPaid ? priceMember : 0,
        price_nonmember: isPaid ? priceNonmember : 0,
        seats: Number(seats) || 0,
        taken: 0,
        is_free: !isPaid,
        sumup_link: isPaid ? sumupLink : null,
        approved: false,
        category: category || "autre",
        latitude,
        longitude
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur insertion événement:", error);
      return res.status(500).json({ error: "Erreur lors de la création de l'événement" });
    }

    return res.status(200).json({ event: data });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
