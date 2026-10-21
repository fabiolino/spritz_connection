// Liste d'attente des soirées complètes — pas une fonction serverless (le "_" l'exclut).
//
// - joinWaitlist : la personne laisse nom, email, mobile et nombre de places ; elle reçoit un email
//   avec sa position.
// - notifyWaitlist : dès que des places se libèrent (désistement, report, places ajoutées…), on prévient
//   les premiers de la liste par email : « premier arrivé, premier servi » via le lien de la soirée.
//   On prévient un peu plus de monde que de places libres pour que la place soit reprise vite.
// - Une personne qui finit par réserver sort de la liste toute seule (trigger waitlist_booked en base).

import { sendViaBrevo } from "./_email.js";

const ORANGE = "#F05A19";
const INK = "#062B49";
const MUTED = "#5C6B7A";
const CREAM = "#FFFAF0";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function appUrl() {
  return (process.env.PUBLIC_APP_URL || "https://spritz-connection.vercel.app").replace(/\/$/, "");
}
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
function parisDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

function wrap(title, bodyHtml) {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:${INK};color:#ffffff;padding:18px 22px;border-bottom:5px solid ${ORANGE}">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.9">Spritz Connection</div>
<div style="font-size:22px;font-weight:700;margin-top:4px">${esc(title)}</div></td></tr>
<tr><td style="padding:20px 22px 22px;font-size:15px;line-height:1.55">${bodyHtml}
<p style="margin:18px 0 0;font-size:12px;color:${MUTED}">A presto ! — Fabio, Spritz Connection</p></td></tr>
</table></td></tr></table></body></html>`;
}

function btn(href, label) {
  return `<a href="${esc(href)}" style="display:inline-block;background:${ORANGE};color:#fff;border-radius:12px;padding:12px 20px;font-weight:700;font-size:15px;text-decoration:none">${esc(label)}</a>`;
}

export async function waitlistFor(supabaseAdmin, eventId) {
  const { data } = await supabaseAdmin
    .from("event_waitlist")
    .select("id, name, email, phone, quantity, status, notified_at, created_at")
    .eq("event_id", eventId)
    .in("status", ["waiting", "notified"])
    .order("created_at", { ascending: true });
  return data || [];
}

export async function joinWaitlist(supabaseAdmin, { eventId, userId, name, email, phone, quantity }) {
  name = String(name || "").trim().slice(0, 80);
  email = String(email || "").trim().toLowerCase().slice(0, 120);
  phone = String(phone || "").trim().slice(0, 30);
  quantity = Math.max(1, Math.min(6, parseInt(quantity, 10) || 1));
  if (!name) return { error: "Indique ton prénom et ton nom." };
  if (!EMAIL_RE.test(email)) return { error: "Ton adresse email ne semble pas valide." };
  if (phone.replace(/\D/g, "").length < 9) return { error: "Indique ton numéro de mobile." };

  const { data: ev } = await supabaseAdmin.from("events").select("id, title, event_date, seats, taken, approved").eq("id", eventId).maybeSingle();
  if (!ev || !ev.approved) return { error: "Soirée introuvable.", status: 404 };
  if (new Date(ev.event_date).getTime() < Date.now()) return { error: "Cette soirée est déjà passée." };

  const list = await waitlistFor(supabaseAdmin, eventId);
  const mine = list.find((w) => w.email === email);
  if (mine) {
    await supabaseAdmin.from("event_waitlist").update({ name, phone, quantity }).eq("id", mine.id);
  } else {
    const { error } = await supabaseAdmin.from("event_waitlist").insert({ event_id: eventId, user_id: userId || null, name, email, phone, quantity });
    if (error) throw error;
  }
  const after = await waitlistFor(supabaseAdmin, eventId);
  const position = after.findIndex((w) => w.email === email) + 1;

  if (!mine) {
    const url = `${appUrl()}/event/${eventId}`;
    const first = name.split(/\s+/)[0];
    const html = wrap(ev.title, `<p style="margin:0 0 12px">Ciao ${esc(first)} ! 🍹</p>
<p style="margin:0 0 12px">La soirée est complète pour l'instant, mais tu es sur la <strong>liste d'attente</strong> (position ${position}, ${quantity} place${quantity > 1 ? "s" : ""}).</p>
<p style="margin:0 0 4px">📅 ${esc(parisDate(ev.event_date))}</p>
<p style="margin:14px 0">Dès qu'une place se libère, on t'écrit : la place revient à la première personne qui réserve, alors ouvre vite le lien ce jour-là.</p>
<p style="margin:0">${btn(url, "Voir la soirée")}</p>`);
    const text = `Ciao ${first} !\nLa soirée ${ev.title} (${parisDate(ev.event_date)}) est complète : tu es sur la liste d'attente (position ${position}). Dès qu'une place se libère, on t'écrit.\n${url}`;
    const r = await sendViaBrevo({ to: email, toName: name, subject: `Liste d'attente — ${ev.title}`, html, text, tag: "liste-attente" });
    if (!r.ok) console.error("Email liste d'attente non envoyé:", r.error || r.skipped);
  }
  return { ok: true, position, already: !!mine };
}

// Prévient la liste d'attente si des places sont libres. Renvoie le nombre de personnes prévenues.
export async function notifyWaitlist(supabaseAdmin, eventId) {
  try {
    const { data: ev } = await supabaseAdmin.from("events").select("id, title, event_date, address, seats, taken").eq("id", eventId).maybeSingle();
    if (!ev || !ev.seats) return 0;
    if (new Date(ev.event_date).getTime() < Date.now() + 30 * 60 * 1000) return 0;
    const free = ev.seats - (ev.taken || 0);
    if (free <= 0) return 0;
    const list = await waitlistFor(supabaseAdmin, eventId);
    // Personnes pas encore prévenues, ou prévenues il y a plus de 24 h sans avoir réservé
    const stale = Date.now() - 24 * 3600 * 1000;
    const candidates = list.filter((w) => w.quantity <= free && (w.status === "waiting" || new Date(w.notified_at).getTime() < stale));
    const quota = Math.min(10, free * 2);
    const pick = [];
    let places = 0;
    for (const w of candidates) {
      if (places >= quota) break;
      pick.push(w);
      places += w.quantity;
    }
    let sent = 0;
    const url = `${appUrl()}/event/${eventId}`;
    for (const w of pick) {
      const first = w.name.split(/\s+/)[0];
      const html = wrap(ev.title, `<p style="margin:0 0 12px">Ciao ${esc(first)} ! 🍹</p>
<p style="margin:0 0 12px"><strong>Bonne nouvelle : ${free > 1 ? `${free} places viennent` : "une place vient"} de se libérer</strong> pour cette soirée.</p>
<p style="margin:0 0 4px">📅 ${esc(parisDate(ev.event_date))}</p>
${ev.address ? `<p style="margin:0 0 4px">📍 ${esc(ev.address)}</p>` : ""}
<p style="margin:14px 0">Tu étais sur la liste d'attente : la place revient à la première personne qui réserve, alors ne tarde pas.</p>
<p style="margin:0">${btn(url, "Réserver ma place")}</p>`);
      const text = `Ciao ${first} ! Une place vient de se libérer pour ${ev.title} (${parisDate(ev.event_date)}). Premier arrivé, premier servi : ${url}`;
      const r = await sendViaBrevo({ to: w.email, toName: w.name, subject: `Une place s'est libérée — ${ev.title}`, html, text, tag: "liste-attente-place" });
      if (r.ok) {
        sent++;
        await supabaseAdmin.from("event_waitlist").update({ status: "notified", notified_at: new Date().toISOString() }).eq("id", w.id);
      } else {
        console.error("Email place libérée non envoyé:", r.error || r.skipped);
      }
    }
    return sent;
  } catch (err) {
    console.error("Erreur liste d'attente:", err);
    return 0;
  }
}
