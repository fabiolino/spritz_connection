// Note de la soirée (1 à 5 étoiles + commentaire facultatif) — pas une fonction serverless.
// Le lien est envoyé dans l'email de remerciement du lendemain : /note/<id d'inscription>?n=<note>.
// Un commentaire est transmis à l'équipe par email.

import { sendViaBrevo, GOOGLE_REVIEW_URL } from "./_email.js";
import { notifyEmail } from "./_notify.js";

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function loadReg(supabaseAdmin, registrationId) {
  if (!UUID_RE.test(String(registrationId || ""))) return null;
  const { data: reg } = await supabaseAdmin
    .from("registrations")
    .select("id, event_id, user_id, guest_name, guest_email")
    .eq("id", registrationId)
    .maybeSingle();
  if (!reg?.event_id) return null;
  const { data: event } = await supabaseAdmin.from("events").select("id, title, event_date").eq("id", reg.event_id).maybeSingle();
  if (!event) return null;
  let name = reg.guest_name;
  let email = reg.guest_email;
  if (reg.user_id) {
    const { data: p } = await supabaseAdmin.from("profiles").select("name, email").eq("id", reg.user_id).maybeSingle();
    name = name || p?.name;
    email = email || p?.email;
  }
  return { reg, event, name: name || "", email: email || "" };
}

export async function rateEvent(supabaseAdmin, { registrationId, rating, comment }) {
  const found = await loadReg(supabaseAdmin, registrationId);
  if (!found) return { error: "Lien invalide", status: 404 };
  const { reg, event, name, email } = found;
  if (new Date(event.event_date).getTime() > Date.now()) return { error: "La soirée n'a pas encore eu lieu." };

  const { data: existing } = await supabaseAdmin.from("event_ratings").select("rating, comment").eq("registration_id", reg.id).maybeSingle();
  const n = parseInt(rating, 10);
  const note = n >= 1 && n <= 5 ? n : existing?.rating;
  const text = typeof comment === "string" ? comment.trim().slice(0, 2000) : undefined;
  if (note) {
    await supabaseAdmin.from("event_ratings").upsert(
      {
        registration_id: reg.id,
        event_id: event.id,
        rating: note,
        ...(text !== undefined ? { comment: text || null } : {}),
        updated_at: new Date().toISOString()
      },
      { onConflict: "registration_id" }
    );
  }
  if (text) {
    const subject = `Avis sur ${event.title} — ${note || "?"}/5 de ${name || "un participant"}`;
    const html = `<p><strong>${name || "Un participant"}</strong>${email ? ` (${email})` : ""} a noté <strong>${event.title}</strong> : ${"★".repeat(note || 0)}${"☆".repeat(5 - (note || 0))} (${note || "?"}/5)</p><blockquote style="border-left:3px solid #F05A19;margin:0;padding:6px 12px">${text.replace(/[<>&]/g, "").replace(/\n/g, "<br>")}</blockquote>`;
    const r = await sendViaBrevo({ to: notifyEmail(), toName: "Spritz Connection", subject, html, text: `${name} (${email}) — ${note}/5\n\n${text}`, tag: "avis-soiree" });
    if (!r.ok) console.error("Avis non transmis:", r.error || r.skipped);
  }
  return {
    ok: true,
    rating: note || null,
    comment: text !== undefined ? text : existing?.comment || null,
    eventTitle: event.title,
    firstName: String(name).trim().split(/\s+/)[0] || "",
    googleUrl: GOOGLE_REVIEW_URL
  };
}

// Pour l'admin : moyenne et commentaires d'une soirée
export async function ratingsFor(supabaseAdmin, eventId) {
  const { data } = await supabaseAdmin.from("event_ratings").select("registration_id, rating, comment, updated_at").eq("event_id", eventId).order("updated_at", { ascending: false });
  const list = data || [];
  const avg = list.length ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10 : null;
  return { count: list.length, average: avg, comments: list.filter((r) => r.comment).map((r) => ({ rating: r.rating, comment: r.comment, at: r.updated_at })) };
}
