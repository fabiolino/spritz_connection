// Contacts laissés pendant ou après une soirée — pas une fonction serverless (le "_" l'exclut).
//
// Deux portes d'entrée, pensées pour les personnes inscrites ailleurs (Meet5…) dont on n'a
// ni email ni mobile :
//   - « photos » : la page /photos/<soirée>, où l'on laisse son email pour voir les photos ;
//   - « table »  : le QR code posé sur les tables pendant la soirée (/bienvenue/<soirée>).
// Le contact est enregistré dans event_contacts (une ligne par soirée et par email), ajouté
// à la liste Brevo « Spritz Connection », et reçoit le lendemain le mail de remerciement
// (avis Google, photos, prochaines soirées) — voir send-thanks.js.

import { randomUUID } from "node:crypto";
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
    // Dépôt ouvert dès le début de la soirée et pendant 60 jours
    uploadOpen:
      Date.now() >= new Date(event.event_date).getTime() - 30 * 60 * 1000 &&
      Date.now() <= new Date(event.event_date).getTime() + 60 * 24 * 3600 * 1000,
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
    .select("id, photo_url, media_type")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  return { ok: true, firstName: name.split(" ")[0], email, event: info, photos: photos || [] };
}

// Photos d'une soirée pour qui a déjà laissé son email sur cet appareil
export async function eventPhotos(supabaseAdmin, eventId) {
  const info = await contactEventInfo(supabaseAdmin, eventId);
  if (!info) return null;
  const { data: photos } = await supabaseAdmin
    .from("event_photos")
    .select("id, photo_url, media_type")
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

// ---------------------------------------------------------------------------
// Photos et vidéos déposées par les participants (page /photos/<soirée>)
// Tout le monde peut déposer : membre connecté, ou personne qui a laissé son email
// sur la page. Le fichier part directement du téléphone vers Supabase Storage
// (lien d'envoi signé), sans passer par Vercel (limite de 4,5 Mo par requête).
// Publication immédiate ; l'administrateur peut supprimer depuis l'Admin.

export const MEDIA_BUCKET = "event-photos";
const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
const MEDIA_MAX_PER_PERSON = 40;
const MEDIA_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm"
};

// Qui dépose ? Un membre connecté (jeton) ou un email déjà laissé pour cette soirée.
async function mediaUploader(supabaseAdmin, eventId, body, accessToken) {
  if (accessToken) {
    const { data } = await supabaseAdmin.auth.getUser(accessToken);
    if (data?.user) {
      const { data: p } = await supabaseAdmin.from("profiles").select("name").eq("id", data.user.id).maybeSingle();
      return { userId: data.user.id, name: p?.name || "", email: String(data.user.email || "").toLowerCase() };
    }
  }
  const email = clean(body?.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  const { data: c } = await supabaseAdmin.from("event_contacts").select("name").eq("event_id", eventId).eq("email", email).maybeSingle();
  if (c) return { userId: null, name: c.name || "", email };
  const { data: r } = await supabaseAdmin.from("registrations").select("guest_name").eq("event_id", eventId).ilike("guest_email", email).limit(1);
  if (r && r[0]) return { userId: null, name: r[0].guest_name || "", email };
  return null;
}

async function mediaEventOk(supabaseAdmin, eventId) {
  if (!UUID_RE.test(String(eventId || ""))) return false;
  const { data: ev } = await supabaseAdmin.from("events").select("event_date, approved").eq("id", eventId).maybeSingle();
  if (!ev?.approved) return false;
  const start = new Date(ev.event_date).getTime();
  // Dès le début de la soirée et pendant 60 jours
  return Date.now() >= start - 30 * 60 * 1000 && Date.now() <= start + 60 * 24 * 3600 * 1000;
}

// Étape 1 : vérifie et renvoie un lien d'envoi signé pour un fichier
export async function mediaUploadUrl(supabaseAdmin, body, accessToken) {
  const eventId = String(body?.eventId || "");
  if (!body?.consent) return { error: "Coche la case : les personnes visibles sont d'accord." };
  if (!(await mediaEventOk(supabaseAdmin, eventId))) return { error: "Le dépôt de photos n'est pas ouvert pour cette soirée." };
  const who = await mediaUploader(supabaseAdmin, eventId, body, accessToken);
  if (!who) return { error: "Laisse d'abord ton prénom et ton email sur cette page.", status: 403 };
  const type = String(body?.contentType || "").toLowerCase();
  const ext = MEDIA_TYPES[type];
  if (!ext) return { error: "Format non pris en charge (photo JPG/PNG ou vidéo MP4/MOV)." };
  const size = Number(body?.size) || 0;
  if (size <= 0 || size > MEDIA_MAX_BYTES) return { error: "Fichier trop lourd : 50 Mo au maximum (vidéo d'environ 30 secondes)." };
  const { count } = await supabaseAdmin
    .from("event_photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("uploader_email", who.email);
  if ((count || 0) >= MEDIA_MAX_PER_PERSON) return { error: `${MEDIA_MAX_PER_PERSON} fichiers maximum par personne et par soirée.` };
  const path = `${eventId}/${randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error) {
    console.error("Lien d'envoi photo:", error.message);
    return { error: "Envoi impossible pour le moment, réessaie dans un instant.", status: 500 };
  }
  return { ok: true, path: data.path || path, token: data.token };
}

// Étape 2 : le fichier est arrivé → on l'ajoute à la galerie de la soirée
export async function mediaRegister(supabaseAdmin, body, accessToken) {
  const eventId = String(body?.eventId || "");
  const path = String(body?.path || "");
  if (!new RegExp(`^${eventId}/[0-9a-f-]{36}\\.(${Object.values(MEDIA_TYPES).join("|")})$`, "i").test(path)) return { error: "Fichier inconnu." };
  if (!(await mediaEventOk(supabaseAdmin, eventId))) return { error: "Le dépôt de photos n'est pas ouvert pour cette soirée." };
  const who = await mediaUploader(supabaseAdmin, eventId, body, accessToken);
  if (!who) return { error: "Laisse d'abord ton prénom et ton email sur cette page.", status: 403 };
  const fileName = path.split("/")[1];
  const { data: found } = await supabaseAdmin.storage.from(MEDIA_BUCKET).list(eventId, { search: fileName, limit: 1 });
  if (!found || !found.length) return { error: "Le fichier n'est pas arrivé, réessaie." };
  const { data: pub } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const mediaType = /\.(mp4|mov|webm)$/i.test(path) ? "video" : "image";
  const { data: row, error } = await supabaseAdmin
    .from("event_photos")
    .insert({ event_id: eventId, user_id: who.userId, photo_url: pub.publicUrl, media_type: mediaType, uploader_name: who.name || null, uploader_email: who.email })
    .select("id, photo_url, media_type")
    .single();
  if (error) {
    console.error("Photo non enregistrée:", error.message);
    return { error: "Enregistrement impossible, réessaie.", status: 500 };
  }
  return { ok: true, photo: row };
}

// Admin : suppression d'une photo ou vidéo (fichier + ligne)
export async function mediaDelete(supabaseAdmin, photoId) {
  if (!UUID_RE.test(String(photoId || ""))) return { error: "Photo inconnue." };
  const { data: row } = await supabaseAdmin.from("event_photos").select("id, photo_url").eq("id", photoId).maybeSingle();
  if (!row) return { ok: true };
  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const i = row.photo_url.indexOf(marker);
  if (i >= 0) await supabaseAdmin.storage.from(MEDIA_BUCKET).remove([decodeURIComponent(row.photo_url.slice(i + marker.length))]);
  await supabaseAdmin.from("event_photos").delete().eq("id", photoId);
  return { ok: true };
}

// Admin : photos et vidéos d'une soirée
export async function mediaFor(supabaseAdmin, eventId) {
  const { data } = await supabaseAdmin
    .from("event_photos")
    .select("id, photo_url, media_type, uploader_name, uploader_email, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  return data || [];
}
