// Contrôle des billets à l'entrée (espace lieu /lieu/<token>) — pas une fonction serverless.
//
// Le QR code d'un billet contient simplement l'adresse du billet :
//   https://spritz-connection.vercel.app/ticket/<id de l'inscription>
// Il fonctionne donc pour TOUS les billets, y compris ceux émis avant cette fonction.
// Le lieu peut aussi valider à la main (code à 6 caractères ou bouton « Arrivé » dans la liste).

import QRCode from "qrcode";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function ticketUrl(registrationId) {
  const base = (process.env.PUBLIC_APP_URL || "https://spritz-connection.vercel.app").replace(/\/$/, "");
  return `${base}/ticket/${registrationId}`;
}

// Image PNG du QR code d'un billet (utilisée dans les emails)
export async function qrPng(registrationId) {
  return QRCode.toBuffer(ticketUrl(registrationId), { type: "png", width: 360, margin: 2, errorCorrectionLevel: "M", color: { dark: "#062B49", light: "#FFFFFF" } });
}

export function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ""));
}

// Ce que contient le QR scanné (adresse du billet ou identifiant) → identifiant d'inscription, ou null
export function parseScanned(text) {
  const m = String(text || "").match(UUID_RE);
  return m ? m[0].toLowerCase() : null;
}

async function venueFromToken(supabaseAdmin, token) {
  const tok = String(token || "").trim();
  if (!/^[0-9a-f]{16,64}$/.test(tok)) return null;
  const { data } = await supabaseAdmin.from("venues").select("id, name").eq("access_token", tok).maybeSingle();
  return data || null;
}

// body : { token, scanned? | (eventId? + code), via?: "liste", undo? }
export async function venueCheckin(supabaseAdmin, body) {
  const venue = await venueFromToken(supabaseAdmin, body.token);
  if (!venue) return { status: 404, error: "Lien de l'espace lieu invalide" };

  const fields = "id, event_id, user_id, guest_name, quantity, attendee_names, amount, paid, external, ticket_code, checked_in_at, reservation_expired_at";
  let reg = null;
  const regId = parseScanned(body.scanned);
  if (regId) {
    const { data } = await supabaseAdmin.from("registrations").select(fields).eq("id", regId).maybeSingle();
    reg = data;
  } else if (body.code) {
    const code = String(body.code).trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9]{4,10}$/.test(code)) return { status: 400, result: "invalid", error: "Code invalide" };
    // Code saisi à la main : on cherche parmi les soirées du lieu (de la veille à demain)
    const from = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const to = new Date(Date.now() + 36 * 3600 * 1000).toISOString();
    let q = supabaseAdmin.from("events").select("id").eq("venue_id", venue.id).gte("event_date", from).lte("event_date", to);
    if (isUuid(body.eventId)) q = supabaseAdmin.from("events").select("id").eq("venue_id", venue.id).eq("id", body.eventId);
    const { data: evs } = await q;
    const ids = (evs || []).map((e) => e.id);
    if (ids.length) {
      const { data } = await supabaseAdmin.from("registrations").select(fields).in("event_id", ids).eq("ticket_code", code).limit(2);
      if ((data || []).length === 1) reg = data[0];
    }
  }

  if (!reg) return { status: 200, result: "unknown", message: "Billet inconnu" };

  const { data: event } = await supabaseAdmin.from("events").select("id, title, event_date, venue_id").eq("id", reg.event_id).maybeSingle();
  if (!event || event.venue_id !== venue.id) {
    return { status: 200, result: "other-venue", message: "Ce billet n'est pas pour une soirée de votre établissement", event: event ? { title: event.title, event_date: event.event_date } : null };
  }
  if (reg.reservation_expired_at || !(reg.paid || reg.external)) {
    return { status: 200, result: "invalid", message: "Billet non valable (paiement non confirmé ou réservation expirée)", event: { title: event.title, event_date: event.event_date } };
  }

  let name = reg.guest_name;
  if (!name && reg.user_id) {
    const { data: p } = await supabaseAdmin.from("profiles").select("name, email").eq("id", reg.user_id).maybeSingle();
    name = p?.name || (p?.email ? p.email.split("@")[0] : null);
  }
  const total = Math.round((Number(reg.amount) || 0) * 100) / 100;
  const paid = total > 0 && reg.paid ? total : 0;
  const person = {
    name: name || "—",
    code: reg.ticket_code,
    quantity: reg.quantity || 1,
    with: reg.attendee_names || [],
    status: total === 0 ? "Gratuit" : reg.paid ? "Réglé en prévente" : "À régler sur place",
    due: Math.round((total - paid) * 100) / 100
  };
  const ev = { id: event.id, title: event.title, event_date: event.event_date };

  // Annulation d'une validation faite par erreur
  if (body.undo) {
    await supabaseAdmin.from("registrations").update({ checked_in_at: null, checked_in_method: null }).eq("id", reg.id);
    return { status: 200, result: "undone", person, event: ev };
  }

  // Une seule entrée par billet : la mise à jour ne passe que si le billet n'a jamais été validé
  const method = body.scanned ? "scan" : body.via === "liste" ? "liste" : "code";
  const { data: updated } = await supabaseAdmin
    .from("registrations")
    .update({ checked_in_at: new Date().toISOString(), checked_in_method: method })
    .eq("id", reg.id)
    .is("checked_in_at", null)
    .select("checked_in_at");
  if (updated && updated.length) return { status: 200, result: "ok", person, event: ev, checkedInAt: updated[0].checked_in_at };

  const { data: again } = await supabaseAdmin.from("registrations").select("checked_in_at").eq("id", reg.id).maybeSingle();
  return { status: 200, result: "already", person, event: ev, checkedInAt: again?.checked_in_at || reg.checked_in_at };
}
