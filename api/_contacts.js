// Contacts laissés pendant ou après une soirée — pas une fonction serverless (le "_" l'exclut).
//
// Deux portes d'entrée, pensées pour les personnes inscrites ailleurs (Meet5…) dont on n'a
// ni email ni mobile :
//   - « photos » : la page /photos/<soirée>, où l'on laisse son email pour voir les photos ;
//   - « table »  : le QR code posé sur les tables pendant la soirée (/bienvenue/<soirée>).
// Le contact est enregistré dans event_contacts (une ligne par soirée et par email), ajouté
// à la liste Brevo « Spritz Connection », et reçoit le lendemain le mail de remerciement
// (avis Google, photos, prochaines soirées) — voir send-thanks.js.

import { addToSpritzList } from "./_brevo.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

function clean(v, max) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

// Infos publiques d'une soirée pour ces pages : titre, date, lieu, nombre de photos
export async function contactEventInfo(supabaseAdmin, eventId) {
  if (!UUID_RE.test(String(eventId || ""))) return null;
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, title, event_date, address, approved, venue_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || !event.approved) return null;
  let venueName = null;
  if (event.venue_id) {
    const { data: v } = await supabaseAdmin.from("venues").select("name").eq("id", event.venue_id).maybeSingle();
    venueName = v?.name || null;
  }
  const { count } = await supabaseAdmin.from("event_photos").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  return {
    id: event.id,
    title: event.title,
    eventDate: event.event_date,
    venueName,
    past: new Date(event.event_date).getTime() < Date.now(),
    photoCount: count || 0
  };
}

export async function saveEventContact(supabaseAdmin, body) {
  const eventId = String(body?.eventId || "");
  const source = body?.source === "table" ? "table" : "photos";
  const name = clean(body?.name, 80);
  const email = clean(body?.email, 160).toLowerCase();
  const phone = clean(body?.phone, 30);
  if (body?.website) return { ok: true }; // champ piège anti-robots
  if (!body?.consent) return { error: "Merci de cocher la case pour recevoir nos messages." };
  if (!name) return { error: "Ton prénom, s'il te plaît." };
  if (!EMAIL_RE.test(email)) return { error: "Adresse email invalide." };
  if (phone && phone.replace(/[^\d]/g, "").length < 9) return { error: "Numéro de mobile incomplet." };

  const info = await contactEventInfo(supabaseAdmin, eventId);
  if (!info) return { error: "Soirée introuvable.", status: 404 };

  const { data: existing } = await supabaseAdmin.from("event_contacts").select("id, phone").eq("event_id", eventId).eq("email", email).maybeSingle();
  if (existing) {
    await supabaseAdmin
      .from("event_contacts")
      .update({ name, ...(phone || !existing.phone ? { phone: phone || null } : {}), consent_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    const { error } = await supabaseAdmin.from("event_contacts").insert({ event_id: eventId, name, email, phone: phone || null, source });
    if (error) {
      console.error("Contact non enregistré:", error.message);
      return { error: "Enregistrement impossible, réessaie dans un instant.", status: 500 };
    }
  }
  // Un désinscrit qui revient laisser son email l'a fait volontairement : on le réinscrit
  await supabaseAdmin.from("newsletter_optouts").delete().eq("email", email);
  await addToSpritzList(supabaseAdmin, { email, name });

  const { data: photos } = await supabaseAdmin
    .from("event_photos")
    .select("id, photo_url")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  return { ok: true, firstName: name.split(" ")[0], event: info, photos: photos || [] };
}

// Photos d'une soirée pour qui a déjà laissé son email sur cet appareil
export async function eventPhotos(supabaseAdmin, eventId) {
  const info = await contactEventInfo(supabaseAdmin, eventId);
  if (!info) return null;
  const { data: photos } = await supabaseAdmin
    .from("event_photos")
    .select("id, photo_url")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  return { event: info, photos: photos || [] };
}

// Pour l'admin : contacts récupérés pour une soirée
export async function contactsFor(supabaseAdmin, eventId) {
  const { data } = await supabaseAdmin
    .from("event_contacts")
    .select("name, email, phone, source, created_at, thanks_sent_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  return data || [];
}
