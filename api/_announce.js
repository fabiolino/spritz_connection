// Annonce automatique des nouvelles soirées par email — pas une fonction serverless.
//
// Toutes les heures (tâche planifiée Supabase pg_cron → POST /api/event-attendees {action:"announce"}),
// chaque soirée publique et validée qui n'a pas encore été annoncée part en campagne Brevo
// vers la liste « Spritz Connection » (id 11). Une soirée n'est annoncée qu'une fois
// (events.announced_at) et seulement 30 minutes après sa création, pour laisser le temps
// de corriger une faute. Les soirées privées et celles qui ont lieu dans moins de 6 h ne sont pas annoncées.
// Le lien de désinscription est géré par Brevo.

const LIST_ID = Number(process.env.BREVO_SPRITZ_LIST_ID || 11);
const SENDER_EMAIL = process.env.BREVO_CAMPAIGN_SENDER || "fabio@fabiocasilli.com"; // expéditeur validé dans Brevo
const REPLY_TO = process.env.BREVO_REPLY_TO || "fabio@spritzconnection.fr";
const ORANGE = "#F05A19";
const INK = "#062B49";
const MUTED = "#5C6B7A";
const CREAM = "#FFFAF0";
const CATEGORY_IMAGES = ["concert", "karaoke", "apero", "diner", "theatre", "danse", "autre"];

function appUrl() {
  return (process.env.PUBLIC_APP_URL || "https://spritz-connection.vercel.app").replace(/\/$/, "");
}
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
function euro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}
function parisDate(iso) {
  const s = new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function priceLine(supabaseAdmin, ev) {
  if (ev.is_free) return "Gratuit";
  const { data: opts } = await supabaseAdmin.from("event_options").select("price, onsite_price").eq("event_id", ev.id);
  const prices = (opts || []).map((o) => Number(o.price)).filter((p) => p > 0);
  const from = prices.length ? Math.min(...prices) : Number(ev.price_member) || Number(ev.price_nonmember) || 0;
  const onsite = (opts || []).map((o) => Number(o.onsite_price)).filter((p) => p > 0);
  const onsiteFrom = onsite.length ? Math.min(...onsite) : Number(ev.price_nonmember) || 0;
  if (!from) return null;
  return onsiteFrom > from ? `Dès ${euro(from)} en prévente (${euro(onsiteFrom)} sur place)` : `Dès ${euro(from)}`;
}

export function buildAnnounceHtml(ev, price) {
  const url = `${appUrl()}/event/${ev.id}`;
  const image = ev.cover_photo_url || `${appUrl()}/og/${CATEGORY_IMAGES.includes(ev.category) ? ev.category : "default"}.jpg`;
  const desc = String(ev.description || "").trim();
  const short = desc.length > 420 ? desc.slice(0, 400).replace(/\s+\S*$/, "") + "…" : desc;
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:${INK};color:#ffffff;padding:16px 22px;border-bottom:5px solid ${ORANGE}">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.9">Spritz Connection · Nouvelle soirée</div></td></tr>
<tr><td><a href="${esc(url)}"><img src="${esc(image)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0"></a></td></tr>
<tr><td style="padding:22px 24px 6px">
<div style="font-size:26px;font-weight:800;line-height:1.2">${esc(ev.title)}</div>
<p style="margin:12px 0 4px;font-size:15px">📅 ${esc(parisDate(ev.event_date))}</p>
${ev.address ? `<p style="margin:0 0 4px;font-size:15px">📍 ${esc(ev.address)}</p>` : ""}
${price ? `<p style="margin:0 0 4px;font-size:15px">🎟️ ${esc(price)}</p>` : ""}
${short ? `<p style="margin:14px 0 0;font-size:14.5px;line-height:1.6;color:${INK}">${esc(short).replace(/\n/g, "<br>")}</p>` : ""}
</td></tr>
<tr><td align="center" style="padding:20px 24px 8px"><a href="${esc(url)}" style="display:inline-block;background:${ORANGE};color:#fff;border-radius:12px;padding:14px 26px;font-weight:700;font-size:16px;text-decoration:none">Réserver ma place</a></td></tr>
<tr><td align="center" style="padding:4px 24px 18px;font-size:13px;color:${MUTED}">Les places partent vite : réserve à l'avance pour payer moins cher.</td></tr>
<tr><td style="padding:16px 24px 22px;font-size:12px;color:${MUTED};line-height:1.5;border-top:1px solid #EADFC4">
A presto ! — Fabio, Spritz Connection<br>
Toutes nos soirées sont dans l'app : <a href="${appUrl()}" style="color:${ORANGE}">spritz-connection.vercel.app</a><br><br>
Tu reçois cet email car tu es inscrit·e à la liste Spritz Connection. <a href="{{ unsubscribe }}" style="color:${MUTED}">Se désinscrire</a>
</td></tr></table></td></tr></table></body></html>`;
}

async function brevo(path, body) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

export async function announceNewEvents(supabaseAdmin, { dry = false } = {}) {
  const graceIso = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const soonIso = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
  const { data: events, error } = await supabaseAdmin
    .from("events")
    .select("id, title, description, event_date, address, category, cover_photo_url, is_free, price_member, price_nonmember, visibility, created_at")
    .eq("approved", true)
    .is("announced_at", null)
    .lte("created_at", graceIso)
    .gte("event_date", soonIso)
    .order("event_date", { ascending: true })
    .limit(3);
  if (error) throw error;
  const out = [];
  for (const ev of events || []) {
    if (ev.visibility === "private") {
      if (!dry) await supabaseAdmin.from("events").update({ announced_at: new Date().toISOString() }).eq("id", ev.id);
      out.push({ event: ev.title, skipped: "privée" });
      continue;
    }
    if (dry) {
      out.push({ event: ev.title, wouldSend: true });
      continue;
    }
    // « Réservation » de l'annonce pour ne jamais l'envoyer deux fois
    const { data: claimed } = await supabaseAdmin.from("events").update({ announced_at: new Date().toISOString() }).eq("id", ev.id).is("announced_at", null).select("id");
    if (!claimed || !claimed.length) continue;
    try {
      const price = await priceLine(supabaseAdmin, ev);
      const day = new Date(ev.event_date).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
      const campaign = await brevo("/emailCampaigns", {
        name: `Nouvelle soirée — ${ev.title} (${day})`,
        subject: `Nouvelle soirée : ${ev.title}, ${day} 🍹`,
        previewText: price ? `${price} — réserve ta place dans l'app` : "Réserve ta place dans l'app",
        sender: { name: "Spritz Connection", email: SENDER_EMAIL },
        replyTo: REPLY_TO,
        htmlContent: buildAnnounceHtml(ev, price),
        recipients: { listIds: [LIST_ID] }
      });
      await brevo(`/emailCampaigns/${campaign.id}/sendNow`);
      out.push({ event: ev.title, campaignId: campaign.id });
    } catch (err) {
      console.error("Annonce non envoyée:", err);
      // On libère pour réessayer à la prochaine heure
      await supabaseAdmin.from("events").update({ announced_at: null }).eq("id", ev.id);
      out.push({ event: ev.title, error: String(err.message || err) });
    }
  }
  return out;
}

// Campagne générique vers la liste « Spritz Connection » (utilisée pour les nouveautés de l'app)
export async function sendListCampaign({ name, subject, previewText, html, tag }) {
  const campaign = await brevo("/emailCampaigns", {
    name,
    subject,
    previewText,
    sender: { name: "Spritz Connection", email: SENDER_EMAIL },
    replyTo: REPLY_TO,
    htmlContent: html,
    recipients: { listIds: [LIST_ID] }
  });
  await brevo(`/emailCampaigns/${campaign.id}/sendNow`);
  return campaign.id;
}

export function buildUpdateHtml(update) {
  const url = `${appUrl()}/nouveautes`;
  const paras = String(update.body || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:${INK};color:#ffffff;padding:18px 24px;border-bottom:5px solid ${ORANGE}">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.9">Spritz Connection · Nouveau dans l'app</div>
<div style="font-size:22px;font-weight:800;margin-top:6px;line-height:1.25">✨ ${esc(update.title)}</div></td></tr>
<tr><td style="padding:22px 24px 4px">${paras}</td></tr>
<tr><td align="center" style="padding:10px 24px 22px"><a href="${esc(url)}" style="display:inline-block;background:${ORANGE};color:#fff;border-radius:12px;padding:14px 26px;font-weight:700;font-size:16px;text-decoration:none">Ouvrir l'app</a></td></tr>
<tr><td style="padding:16px 24px 22px;font-size:12px;color:${MUTED};line-height:1.5;border-top:1px solid #EADFC4">
A presto ! — Fabio, Spritz Connection<br><br>
Tu reçois cet email car tu es inscrit·e à la liste Spritz Connection. <a href="{{ unsubscribe }}" style="color:${MUTED}">Se désinscrire</a>
</td></tr></table></td></tr></table></body></html>`;
}
