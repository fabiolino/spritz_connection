// Notifications internes d'inscription — pas une fonction serverless (le "_" l'exclut).
//
//  1. À CHAQUE inscription confirmée : un email à l'équipe (NOTIFY_EMAIL, par défaut
//     fabiocasilli@gmail.com) avec nom, email, mobile, places, montants et statut de paiement.
//  2. RETARDATAIRES : si l'événement a lieu aujourd'hui (heure de Paris) et qu'il est 14 h passées,
//     le lieu reçoit aussi un email individuel (sans l'email du participant).
//  3. Récapitulatif du jour J à 14 h : voir api/venue-recap.js (utilise les fonctions d'ici).
//
// Un email de notification ne bloque jamais une inscription : toute erreur est seulement journalisée.
// Nécessite la colonne registrations.notified_at (supabase-migration-notifications-lieux.sql).

import { sendViaBrevo } from "./_email.js";

export const NOTIFY_FALLBACK = "fabiocasilli@gmail.com";
export const RECAP_HOUR = 14; // heure de Paris

export function notifyEmail() {
  return (process.env.NOTIFY_EMAIL || NOTIFY_FALLBACK).trim().toLowerCase();
}

const INK = "#062B49";
const MUTED = "#5C6B7A";
const ORANGE = "#F05A19";
const LINE = "#EADFC4";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function euro(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}

export function parisParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

export function parisLabel(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Montants d'une inscription : « réglé en prévente » ou « à régler sur place »
export function paymentOf(reg) {
  const total = Math.round((Number(reg.amount) || 0) * 100) / 100;
  if (total === 0) return { total, paid: 0, due: 0, label: "Gratuit" };
  if (reg.paid) return { total, paid: total, due: 0, label: "Réglé en prévente" };
  return { total, paid: 0, due: total, label: "À régler sur place" };
}

const TH = `style="text-align:left;padding:6px 8px;border-bottom:2px solid ${INK};font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:${MUTED}"`;
const TD = `style="padding:7px 8px;border-bottom:1px solid ${LINE};font-size:14px;vertical-align:top"`;

function wrap(title, intro, body) {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:16px;background:#FFFAF0;font-family:Helvetica,Arial,sans-serif;color:${INK}">
<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
<div style="background:${INK};color:#fff;padding:16px 20px;border-bottom:5px solid ${ORANGE}">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.9">Spritz Connection</div>
<div style="font-size:19px;font-weight:700;margin-top:4px">${esc(title)}</div></div>
<div style="padding:16px 20px;font-size:14px;line-height:1.5">${intro}${body}</div></div></body></html>`;
}

// Tableau des participants. withEmail : colonne email (équipe uniquement, jamais pour les lieux).
export function participantsTable(rows, { withEmail }) {
  const head = `<tr><th ${TH}>Participant</th>${withEmail ? `<th ${TH}>E-mail</th>` : ""}<th ${TH}>Mobile</th><th ${TH}>Places</th><th ${TH}>Réglé en prévente</th><th ${TH}>À régler sur place</th></tr>`;
  const body = rows
    .map((r) => {
      const p = paymentOf(r.reg);
      return `<tr><td ${TD}><strong>${esc(r.name)}</strong></td>${withEmail ? `<td ${TD}>${esc(r.email || "—")}</td>` : ""}<td ${TD}>${esc(r.reg.guest_phone || "—")}</td><td ${TD}>${r.reg.quantity || 1}</td><td ${TD}>${p.total === 0 ? "Gratuit" : euro(p.paid)}</td><td ${TD}>${p.due > 0 ? `<strong style="color:${ORANGE}">${euro(p.due)}</strong>` : euro(0)}</td></tr>`;
    })
    .join("");
  const places = rows.reduce((n, r) => n + (r.reg.quantity || 1), 0);
  const paid = rows.reduce((n, r) => n + paymentOf(r.reg).paid, 0);
  const due = rows.reduce((n, r) => n + paymentOf(r.reg).due, 0);
  const foot = `<tr><td ${TD.replace("padding:7px 8px", "padding:9px 8px;font-weight:700")} colspan="${withEmail ? 3 : 2}">Total</td><td ${TD.replace("padding:7px 8px", "padding:9px 8px;font-weight:700")}>${places}</td><td ${TD.replace("padding:7px 8px", "padding:9px 8px;font-weight:700")}>${euro(paid)}</td><td ${TD.replace("padding:7px 8px", "padding:9px 8px;font-weight:700")}>${euro(due)}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:10px">${head}${body}${foot}</table>`;
}

function textTable(rows, { withEmail }) {
  return rows
    .map((r) => {
      const p = paymentOf(r.reg);
      return `- ${r.name}${withEmail && r.email ? ` <${r.email}>` : ""} — ${r.reg.guest_phone || "mobile ?"} — ${r.reg.quantity || 1} place(s) — ${p.label}${p.due > 0 ? ` (${euro(p.due)} sur place)` : ""}`;
    })
    .join("\n");
}

// Personnes d'un événement (inscriptions confirmées ou réservées), avec nom et email résolus
export async function loadEventRows(supabaseAdmin, eventId) {
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("id, user_id, guest_name, guest_email, guest_phone, quantity, amount, paid, external, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  const list = (regs || []).filter((r) => r.paid || r.external);
  const ids = [...new Set(list.map((r) => r.user_id).filter(Boolean))];
  const profiles = {};
  if (ids.length) {
    const { data } = await supabaseAdmin.from("profiles").select("id, name, email").in("id", ids);
    (data || []).forEach((p) => (profiles[p.id] = p));
  }
  return list.map((reg) => ({
    reg,
    name: reg.guest_name || profiles[reg.user_id]?.name || profiles[reg.user_id]?.email || "—",
    email: reg.guest_email || profiles[reg.user_id]?.email || null
  }));
}

// Email du lieu : récapitulatif du jour J
export function buildVenueRecap({ event, venueName, rows }) {
  const subject = `Récap ${event.title} — ce soir (${rows.reduce((n, r) => n + (r.reg.quantity || 1), 0)} places)`;
  const intro = `<p style="margin:0 0 6px">Bonjour,</p><p style="margin:0 0 6px">Voici la liste à jour des participants de <strong>${esc(event.title)}</strong>${venueName ? ` chez ${esc(venueName)}` : ""}, ${esc(parisLabel(event.event_date))}.</p><p style="margin:0;color:${MUTED};font-size:13px">Les mobiles servent uniquement à joindre un participant en cas de problème. Les retardataires vous seront signalés individuellement par e-mail.</p>`;
  const html = wrap(`Récap du soir — ${event.title}`, intro, rows.length ? participantsTable(rows, { withEmail: false }) : `<p>Aucune inscription pour le moment.</p>`);
  const text = [`Récap ${event.title} — ${parisLabel(event.event_date)}`, "", rows.length ? textTable(rows, { withEmail: false }) : "Aucune inscription pour le moment.", "", "Spritz Connection"].join("\n");
  return { subject, html, text };
}

// Email du lieu : un retardataire
function buildLateEmail({ event, venueName, row }) {
  const p = paymentOf(row.reg);
  const subject = `Nouvelle inscription de dernière minute — ${event.title} (${row.name}, ${row.reg.quantity || 1} pl.)`;
  const intro = `<p style="margin:0 0 6px">Bonjour,</p><p style="margin:0">Une personne vient de s'inscrire à <strong>${esc(event.title)}</strong>${venueName ? ` chez ${esc(venueName)}` : ""}, ce soir :</p>`;
  const html = wrap("Inscription de dernière minute", intro, participantsTable([row], { withEmail: false }));
  const text = `Inscription de dernière minute — ${event.title}\n\n${textTable([row], { withEmail: false })}\n\nSpritz Connection`;
  return { subject, html, text, paymentLabel: p.label };
}

// Email à l'équipe : une inscription, avec la situation de l'événement
function buildTeamEmail({ event, row, totals }) {
  const p = paymentOf(row.reg);
  const subject = `Inscription — ${event.title} — ${row.name} (${row.reg.quantity || 1} pl., ${p.label.toLowerCase()})`;
  const intro = `<p style="margin:0 0 6px"><strong>${esc(row.name)}</strong> vient de s'inscrire à <strong>${esc(event.title)}</strong>, ${esc(parisLabel(event.event_date))}.</p>`;
  const situation = `<p style="margin:14px 0 0;color:${MUTED};font-size:13px">Situation de l'événement : ${totals.places} place${totals.places > 1 ? "s" : ""}${event.seats ? ` sur ${event.seats}` : ""} — ${euro(totals.paid)} réglés en prévente, ${euro(totals.due)} à encaisser sur place.</p>`;
  const html = wrap("Nouvelle inscription", intro, participantsTable([row], { withEmail: true }) + situation);
  const text = `Nouvelle inscription — ${event.title}\n\n${textTable([row], { withEmail: true })}\n\nSituation : ${totals.places} places — ${euro(totals.paid)} réglés en prévente, ${euro(totals.due)} sur place.`;
  return { subject, html, text };
}

// À appeler quand une inscription vient d'être confirmée (une seule fois par inscription).
// reg = ligne complète de registrations ; event = { id, title, event_date, venue_id, seats }
export async function notifyRegistration(supabaseAdmin, reg, event) {
  try {
    if (!process.env.BREVO_API_KEY || !reg?.id || !event) return;

    // « Réservation » unique de la notification (comme pour confirmation_sent_at)
    const { data: claimed, error } = await supabaseAdmin
      .from("registrations")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", reg.id)
      .is("notified_at", null)
      .select("id");
    if (error) {
      console.error("Notification inscription (colonne notified_at absente ?):", error.message);
      return;
    }
    if (!claimed || claimed.length === 0) return;

    const rows = await loadEventRows(supabaseAdmin, event.id);
    const row = rows.find((r) => r.reg.id === reg.id);
    if (!row) return;
    const totals = {
      places: rows.reduce((n, r) => n + (r.reg.quantity || 1), 0),
      paid: rows.reduce((n, r) => n + paymentOf(r.reg).paid, 0),
      due: rows.reduce((n, r) => n + paymentOf(r.reg).due, 0)
    };

    const team = notifyEmail();
    const content = buildTeamEmail({ event, row, totals });
    const sent = await sendViaBrevo({ to: team, toName: "Spritz Connection", ...content, tag: "notif-inscription" });
    if (!sent.ok) console.error("Notification équipe non envoyée:", sent.error || sent.skipped);

    // Retardataire : événement aujourd'hui (Paris) et 14 h passées -> email individuel au lieu
    const now = parisParts();
    if (event.venue_id && parisParts(new Date(event.event_date)).day === now.day && now.hour >= RECAP_HOUR) {
      const { data: venue } = await supabaseAdmin.from("venues").select("name, contact_email").eq("id", event.venue_id).maybeSingle();
      const to = String(venue?.contact_email || "").trim().toLowerCase();
      // Si le lieu est joignable à l'adresse de l'équipe, il vient déjà de recevoir le mail complet
      if (to && to !== team) {
        const late = buildLateEmail({ event, venueName: venue.name, row });
        const r = await sendViaBrevo({ to, toName: venue.name, subject: late.subject, html: late.html, text: late.text, tag: "lieu-retardataire" });
        if (!r.ok) console.error("Mail retardataire au lieu non envoyé:", r.error || r.skipped);
      }
    }
  } catch (err) {
    console.error("Erreur notification inscription:", err);
  }
}
