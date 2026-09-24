// Déploiement Vercel : POST /api/create-event
// Endpoint protégé par un mot de passe admin simple (pas d'auth utilisateur pour l'instant).
// Un seul fichier gère plusieurs actions (create / update / duplicate / delete)
// pour rester sous la limite de fonctions serverless du plan Vercel Hobby.

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

async function replaceOptions(eventId, options) {
  await supabaseAdmin.from("event_options").delete().eq("event_id", eventId);
  if (Array.isArray(options) && options.length > 0) {
    const optionRows = options
      .filter((o) => o.label && o.price !== "")
      .map((o) => ({ event_id: eventId, label: o.label, price: Number(o.price) || 0 }));
    if (optionRows.length > 0) {
      const { error } = await supabaseAdmin.from("event_options").insert(optionRows);
      if (error) console.error("Erreur insertion options:", error);
    }
  }
}

async function deleteEventCascade(eventId) {
  // 1. Options choisies lors des inscriptions à cet événement
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("id")
    .eq("event_id", eventId);
  const regIds = (regs || []).map((r) => r.id);
  if (regIds.length > 0) {
    await supabaseAdmin.from("registration_options").delete().in("registration_id", regIds);
  }

  // 2. Inscriptions
  await supabaseAdmin.from("registrations").delete().eq("event_id", eventId);

  // 3. Options de l'événement
  await supabaseAdmin.from("event_options").delete().eq("event_id", eventId);

  // 4. Invitations et blocages
  await supabaseAdmin.from("event_invites").delete().eq("event_id", eventId);
  await supabaseAdmin.from("event_blocks").delete().eq("event_id", eventId);

  // 5. Photos (Storage + table)
  const { data: files } = await supabaseAdmin.storage.from("event-photos").list(eventId);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${eventId}/${f.name}`);
    await supabaseAdmin.storage.from("event-photos").remove(paths);
  }
  await supabaseAdmin.from("event_photos").delete().eq("event_id", eventId);

  // 6. L'événement lui-même
  const { error } = await supabaseAdmin.from("events").delete().eq("id", eventId);
  return error;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const {
    adminSecret,
    action,
    eventId,
    newDate,
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
    invitedUserIds,
    venueId,
    sumupLink,
    options
  } = req.body;

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Mot de passe administrateur incorrect" });
  }

  try {
    // --- SUPPRESSION ---
    if (action === "delete") {
      if (!eventId) {
        return res.status(400).json({ error: "eventId manquant" });
      }
      const error = await deleteEventCascade(eventId);
      if (error) {
        console.error("Erreur suppression événement:", error);
        return res.status(500).json({ error: "Erreur lors de la suppression de l'événement" });
      }
      return res.status(200).json({ success: true });
    }

    // --- DUPLICATION ---
    if (action === "duplicate") {
      if (!eventId || !newDate) {
        return res.status(400).json({ error: "eventId ou newDate manquant" });
      }
      const { data: source, error: sourceError } = await supabaseAdmin
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();
      if (sourceError || !source) {
        return res.status(404).json({ error: "Événement source introuvable" });
      }

      const { data: created, error: insertError } = await supabaseAdmin
        .from("events")
        .insert({
          title: source.title,
          organizer: source.organizer,
          description: source.description,
          event_date: parisToISO(newDate),
          address: source.address,
          phone: source.phone,
          price_member: source.price_member,
          price_nonmember: source.price_nonmember,
          seats: source.seats,
          taken: 0,
          category: source.category,
          visibility: source.visibility,
          venue_id: source.venue_id,
          sumup_link: source.sumup_link,
          latitude: source.latitude,
          longitude: source.longitude,
          approved: true
        })
        .select()
        .single();

      if (insertError) {
        console.error("Erreur duplication événement:", insertError);
        return res.status(500).json({ error: "Erreur lors de la duplication de l'événement" });
      }

      const { data: sourceOptions } = await supabaseAdmin
        .from("event_options")
        .select("label, price")
        .eq("event_id", eventId);
      if (sourceOptions && sourceOptions.length > 0) {
        await replaceOptions(created.id, sourceOptions);
      }

      return res.status(200).json({ event: created });
    }

    // --- MODIFICATION ---
    if (action === "update") {
      if (!eventId) {
        return res.status(400).json({ error: "eventId manquant" });
      }
      if (!title || !organizer || !event_date || !address || !phone) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
      }

      const { latitude, longitude } = await geocodeAddress(address);

      const { data, error } = await supabaseAdmin
        .from("events")
        .update({
          title,
          organizer,
          description: description || "",
          event_date: parisToISO(event_date),
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
        return res.status(500).json({ error: "Erreur lors de la mise à jour de l'événement" });
      }

      if (visibility === "private" && Array.isArray(invitedUserIds)) {
        await supabaseAdmin.from("event_invites").delete().eq("event_id", eventId);
        if (invitedUserIds.length > 0) {
          const rows = invitedUserIds.map((userId) => ({ event_id: eventId, invited_user_id: userId }));
          const { error: inviteError } = await supabaseAdmin.from("event_invites").insert(rows);
          if (inviteError) console.error("Erreur insertion invitations:", inviteError);
        }
      }

      await replaceOptions(eventId, options);

      return res.status(200).json({ event: data });
    }

    // --- CRÉATION (comportement par défaut) ---
    if (!title || !organizer || !event_date || !address || !phone) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    const { latitude, longitude } = await geocodeAddress(address);

    const { data, error } = await supabaseAdmin
      .from("events")
      .insert({
        title,
        organizer,
        description: description || "",
        event_date: parisToISO(event_date),
        address,
        phone,
        price_member: Number(price_member) || 0,
        price_nonmember: Number(price_nonmember) || 0,
        seats: Number(seats) || 0,
        taken: 0,
        category: category || "autre",
        visibility: visibility === "private" ? "private" : "public",
        venue_id: venueId || null,
        sumup_link: sumupLink || null,
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
      if (inviteError) console.error("Erreur insertion invitations:", inviteError);
    }

    if (Array.isArray(options) && options.length > 0) {
      await replaceOptions(data.id, options);
    }

    return res.status(200).json({ event: data });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
