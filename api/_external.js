// Réservations venues d'autres applications de sorties, collectées automatiquement
// depuis les emails de notification reçus dans la boîte Gmail de l'organisateur
// (un petit script Google Apps Script les envoie ici toutes les 5 minutes).
//
// Chaque annonce externe (identifiée par son numéro) est rattachée une fois pour toutes
// à une soirée Spritz Connection depuis l'Admin ; ensuite chaque inscription ou désistement
// est reporté tout seul sur la soirée (récap du lieu, espace lieu, compteur de places).

import { notifyRegistration } from "./_notify.js";
import { addTaken, entryTotal, insertRegistration, roundCents, ADVANCE_PRICE_FOR_ALL } from "./_registration.js";

export const EXTERNAL_SOURCE_LABEL = "Autre application";

function clean(s, max = 120) {
  return String(s || "")
    .replace(/[​-‍﻿͏]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normName(s) {
  return clean(s, 80)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>/gi, " $1 ")
    .replace(/<\/?(b|strong|em|i)(\s[^>]*)?>/gi, "*")
    .replace(/<br\s*\/?>|<\/(p|div|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// Lit un email de notification : qui, quoi (inscription ou départ), quelle annonce.
export function parseNotification({ subject = "", body = "", html = "" }) {
  const text = [String(body || ""), htmlToText(html)].join("\n");
  const idMatch = text.match(/meet5\.com\/explore\/activity\/(\d{6,})/i);
  if (!idMatch) return null;
  const externalId = idMatch[1];
  const subj = clean(subject, 160);
  let kind = null;
  let name = null;
  let m = subj.match(/^(.{1,80}?) participe également$/i);
  if (m) [kind, name] = ["join", m[1]];
  m = !kind && subj.match(/^(.{1,80}?) a quitté l['’]activité/i);
  if (m) [kind, name] = ["leave", m[1]];
  const flat = text.replace(/\s+/g, " ");
  const joinRe = /\*?([^*.!?]{1,80}?)\*?\s*vient également de rejoindre la rencontre\s*\*?\s*(.{1,200}?)\s*\*?\s*\.\s*Ouvr/i;
  const leaveRe = /\*?([^*.!?]{1,80}?)\*?\s*vient de quitter l['’]activité\s*\*?\s*(.{1,200}?)\s*\*?\s*\.\s*Consult/i;
  let title = null;
  m = flat.match(joinRe);
  if (m && (!kind || kind === "join")) {
    kind = "join";
    name = name || m[1];
    title = m[2];
  } else {
    m = flat.match(leaveRe);
    if (m && (!kind || kind === "leave")) {
      kind = "leave";
      name = name || m[1];
      title = m[2];
    }
  }
  if (!kind || !name) return null;
  title = title ? clean(title.replace(/^\*+|\*+$/g, ""), 200) : null;
  return { source: "meet5", kind, externalId, name: clean(name.replace(/\*/g, ""), 80), title };
}

function refFor(imp) {
  return `${imp.source}:${imp.external_id}:${normName(imp.name)}`;
}

// Applique une notification déjà enregistrée à la soirée rattachée.
async function applyImport(supabaseAdmin, imp, eventId) {
  const ref = refFor(imp);
  if (imp.kind === "join") {
    const { data: existing } = await supabaseAdmin
      .from("registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("external_ref", ref)
      .limit(1);
    if (existing && existing[0]) return { status: "duplicate", registration_id: existing[0].id };
    // La personne s'est peut-être déjà inscrite directement (billet Spritz, ajout à la main,
    // ou via une autre annonce pour la même soirée) : si UN SEUL inscrit porte ce prénom,
    // on relie les deux au lieu de compter la personne deux fois.
    const first = normName(imp.name).split(" ")[0];
    if (first.length >= 2) {
      const { data: others } = await supabaseAdmin
        .from("registrations")
        .select("id, user_id, guest_name, external_ref")
        .eq("event_id", eventId);
      const userIds = (others || []).filter((r) => r.user_id && !r.guest_name).map((r) => r.user_id);
      let names = {};
      if (userIds.length) {
        const { data: profs } = await supabaseAdmin.from("profiles").select("id, name").in("id", userIds);
        (profs || []).forEach((p) => (names[p.id] = p.name));
      }
      const candidates = (others || []).filter((r) => {
        const tokens = normName(r.guest_name || names[r.user_id] || "").split(" ");
        return tokens.includes(first);
      });
      if (candidates.length === 1) {
        const c = candidates[0];
        if (!c.external_ref) await supabaseAdmin.from("registrations").update({ external_ref: ref }).eq("id", c.id);
        return { status: "duplicate", registration_id: c.id };
      }
    }
    const { data: ev } = await supabaseAdmin
      .from("events")
      .select("id, title, event_date, venue_id, is_free, price_member, price_nonmember, seats, taken")
      .eq("id", eventId)
      .maybeSingle();
    if (!ev) return { status: "pending" };
    const amount = ev.is_free ? 0 : roundCents(entryTotal(ev, { isMember: false, quantity: 1, advancePriceForAll: ADVANCE_PRICE_FOR_ALL }));
    const paid = !!ev.is_free;
    const reg = await insertRegistration(supabaseAdmin, {
      event_id: eventId,
      user_id: null,
      guest_name: imp.name,
      source: EXTERNAL_SOURCE_LABEL,
      external_ref: ref,
      quantity: 1,
      attendee_names: [],
      option: "manuel",
      amount,
      paid,
      paid_at: paid ? new Date().toISOString() : null,
      external: !paid
    });
    await addTaken(supabaseAdmin, eventId, 1);
    // Lieu prévenu si c'est le jour même après 14 h ; pas d'email à l'équipe
    await notifyRegistration(supabaseAdmin, reg, ev, { skipTeam: true }).catch(() => {});
    return { status: "imported", registration_id: reg.id };
  }
  // Départ : on retire l'inscription correspondante et on libère la place
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("id, event_id, quantity, paid, external")
    .eq("event_id", eventId)
    .eq("external_ref", ref)
    .order("created_at", { ascending: false })
    .limit(1);
  const reg = regs && regs[0];
  if (!reg) return { status: "no-match" };
  await supabaseAdmin.from("registration_options").delete().eq("registration_id", reg.id);
  await supabaseAdmin.from("registrations").delete().eq("id", reg.id);
  if (reg.paid || reg.external) await addTaken(supabaseAdmin, eventId, -(reg.quantity || 1));
  return { status: "cancelled", registration_id: reg.id };
}

// Traite, dans l'ordre d'arrivée, toutes les notifications en attente d'une annonce.
export async function processPending(supabaseAdmin, source, externalId) {
  const { data: link } = await supabaseAdmin
    .from("external_links")
    .select("event_id, ignored")
    .eq("source", source)
    .eq("external_id", externalId)
    .maybeSingle();
  if (!link || (!link.event_id && !link.ignored)) return 0;
  const { data: items } = await supabaseAdmin
    .from("external_imports")
    .select("*")
    .eq("source", source)
    .eq("external_id", externalId)
    .eq("status", "pending")
    .order("received_at", { ascending: true });
  let done = 0;
  for (const imp of items || []) {
    const result = link.ignored ? { status: "ignored" } : await applyImport(supabaseAdmin, imp, link.event_id);
    if (result.status === "pending") continue;
    await supabaseAdmin
      .from("external_imports")
      .update({ status: result.status, registration_id: result.registration_id || null })
      .eq("id", imp.id);
    done++;
  }
  return done;
}

// Reçoit un lot d'emails bruts, les enregistre (sans doublon) et les applique.
export async function ingest(supabaseAdmin, messages) {
  const touched = new Set();
  let received = 0;
  let unreadable = 0;
  for (const msg of (messages || []).slice(0, 100)) {
    const messageId = clean(msg.id, 100);
    if (!messageId) continue;
    const parsed = parseNotification({ subject: msg.subject, body: msg.body, html: msg.html });
    if (!parsed) {
      unreadable++;
      continue;
    }
    const receivedAt = msg.date && !isNaN(Date.parse(msg.date)) ? new Date(msg.date).toISOString() : new Date().toISOString();
    const { error } = await supabaseAdmin.from("external_imports").insert({
      message_id: messageId,
      source: parsed.source,
      external_id: parsed.externalId,
      kind: parsed.kind,
      name: parsed.name,
      title: parsed.title,
      received_at: receivedAt
    });
    if (error) {
      if (error.code === "23505") continue; // déjà reçu
      throw error;
    }
    received++;
    // Mémorise l'annonce (titre le plus récent) pour pouvoir la rattacher depuis l'Admin
    const { data: link } = await supabaseAdmin
      .from("external_links")
      .select("external_id")
      .eq("source", parsed.source)
      .eq("external_id", parsed.externalId)
      .maybeSingle();
    if (!link) {
      await supabaseAdmin.from("external_links").insert({ source: parsed.source, external_id: parsed.externalId, title: parsed.title });
    } else if (parsed.title) {
      await supabaseAdmin.from("external_links").update({ title: parsed.title }).eq("source", parsed.source).eq("external_id", parsed.externalId);
    }
    touched.add(`${parsed.source}|${parsed.externalId}`);
  }
  let applied = 0;
  for (const key of touched) {
    const [source, externalId] = key.split("|");
    applied += await processPending(supabaseAdmin, source, externalId);
  }
  return { received, applied, unreadable };
}

// Pour l'Admin : annonces externes, leur rattachement et leurs chiffres.
export async function listLinks(supabaseAdmin) {
  const { data: links } = await supabaseAdmin
    .from("external_links")
    .select("source, external_id, title, event_id, ignored, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  const { data: imports } = await supabaseAdmin
    .from("external_imports")
    .select("source, external_id, kind, name, status, received_at")
    .order("received_at", { ascending: true })
    .limit(3000);
  const byLink = {};
  (imports || []).forEach((i) => {
    const k = `${i.source}|${i.external_id}`;
    const s = (byLink[k] = byLink[k] || { joins: 0, leaves: 0, pending: 0, last: null, names: {} });
    if (i.kind === "join") s.joins++;
    else s.leaves++;
    if (i.status === "pending") s.pending++;
    s.last = i.received_at;
    // participants actuels selon les notifications reçues
    const n = normName(i.name);
    if (i.kind === "join") s.names[n] = i.name;
    else delete s.names[n];
  });
  return (links || []).map((l) => {
    const s = byLink[`${l.source}|${l.external_id}`] || { joins: 0, leaves: 0, pending: 0, last: null, names: {} };
    return {
      source: l.source,
      externalId: l.external_id,
      title: l.title,
      eventId: l.event_id,
      ignored: l.ignored,
      joins: s.joins,
      leaves: s.leaves,
      pending: s.pending,
      lastAt: s.last || l.created_at,
      current: Object.values(s.names)
    };
  });
}

// Rattache une annonce à une soirée (ou l'ignore), puis rattrape les notifications en attente.
// Changer de soirée déplace les inscriptions déjà importées.
export async function setLink(supabaseAdmin, { source, externalId, eventId, ignore }) {
  const { data: link } = await supabaseAdmin
    .from("external_links")
    .select("event_id, ignored")
    .eq("source", source)
    .eq("external_id", externalId)
    .maybeSingle();
  if (!link) throw new Error("Annonce introuvable");
  const newEventId = ignore ? null : eventId || null;
  if (link.event_id !== newEventId || !!link.ignored !== !!ignore) {
    if (link.event_id) {
      // On retire les inscriptions importées de l'ancienne soirée
      const { data: regs } = await supabaseAdmin
        .from("registrations")
        .select("id, quantity, paid, external")
        .eq("event_id", link.event_id)
        .like("external_ref", `${source}:${externalId}:%`);
      for (const r of regs || []) {
        await supabaseAdmin.from("registration_options").delete().eq("registration_id", r.id);
        await supabaseAdmin.from("registrations").delete().eq("id", r.id);
        if (r.paid || r.external) await addTaken(supabaseAdmin, link.event_id, -(r.quantity || 1));
      }
    }
    // Toutes les notifications de l'annonce sont rejouées sur le nouveau choix
    await supabaseAdmin
      .from("external_imports")
      .update({ status: "pending", registration_id: null })
      .eq("source", source)
      .eq("external_id", externalId);
  }
  await supabaseAdmin
    .from("external_links")
    .update({ event_id: newEventId, ignored: !!ignore })
    .eq("source", source)
    .eq("external_id", externalId);
  return processPending(supabaseAdmin, source, externalId);
}
