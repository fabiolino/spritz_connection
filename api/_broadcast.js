// Message de l'admin à tous — pas une fonction serverless (le "_" l'exclut).
//
// Trois canaux, cochés au choix dans l'admin (onglet Membres) :
//  1. Notification push  → tous les appareils qui ont activé les notifications (table push_subscriptions).
//     Envoyée directement d'ici avec les clés VAPID de private_config (mêmes clés que la fonction send-push).
//  2. Bandeau dans l'app → affiché en haut de l'app à chaque compte jusqu'à ce qu'il le ferme
//     (table admin_broadcasts, lue par src/components/BroadcastBanner.jsx). Touche aussi ceux qui
//     ont installé l'app sans activer les notifications.
//  3. E-mail             → chaque compte de l'app (profiles.email), sauf les personnes désinscrites
//     (newsletter_optouts). Lien de désinscription dans chaque e-mail.

import webpush from "web-push";
import { sendViaBrevo } from "./_email.js";
import { unsubscribeUrl } from "./_brevo.js";

const ORANGE = "#F05A19";
const INK = "#062B49";
const MUTED = "#5C6B7A";
const CREAM = "#FFFAF0";

function appUrl() {
  return (process.env.PUBLIC_APP_URL || "https://spritz-connection.vercel.app").replace(/\/$/, "");
}
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Lien interne (« /event/… ») ou adresse complète ; vide = accueil de l'app
export function cleanLink(url) {
  const u = String(url || "").trim();
  if (!u) return null;
  if (u.startsWith("/")) return u.slice(0, 300);
  if (/^https?:\/\//i.test(u)) {
    const base = appUrl();
    return u.startsWith(base) ? u.slice(base.length) || "/" : u.slice(0, 300);
  }
  return null;
}
const absolute = (link) => (!link ? appUrl() : link.startsWith("/") ? appUrl() + link : link);

// Nombre de destinataires possibles par canal (affiché avant l'envoi)
export async function broadcastAudience(supabaseAdmin) {
  const [{ count: devices }, { data: profiles }, { data: optouts }] = await Promise.all([
    supabaseAdmin.from("push_subscriptions").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("email"),
    supabaseAdmin.from("newsletter_optouts").select("email")
  ]);
  const off = new Set((optouts || []).map((o) => String(o.email).toLowerCase()));
  const emails = new Set((profiles || []).map((p) => String(p.email || "").trim().toLowerCase()).filter((e) => e && !off.has(e)));
  return { devices: devices || 0, emails: emails.size, accounts: (profiles || []).length };
}

async function sendPush(supabaseAdmin, b) {
  const { data: cfgRows, error } = await supabaseAdmin.from("private_config").select("key, value").in("key", ["vapid_public", "vapid_private", "vapid_subject"]);
  if (error) throw error;
  const cfg = Object.fromEntries((cfgRows || []).map((r) => [r.key, r.value]));
  if (!cfg.vapid_private) throw new Error("Clés de notification introuvables");
  webpush.setVapidDetails(cfg.vapid_subject, cfg.vapid_public, cfg.vapid_private);

  const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  const text = b.body.replace(/\s+/g, " ").trim();
  const payload = JSON.stringify({
    title: `🍹 ${b.title}`.slice(0, 80),
    body: text.length > 160 ? text.slice(0, 157) + "…" : text,
    url: b.url || "/",
    tag: `broadcast-${b.id}`
  });
  let sent = 0;
  await Promise.all(
    (subs || []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
        sent++;
      } catch (err) {
        // Abonnement expiré ou révoqué : on le retire
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("Push message à tous:", err?.statusCode, err?.body || err?.message);
        }
      }
    })
  );
  return sent;
}

export function buildBroadcastEmail(b, { name, email }) {
  const first = String(name || "").trim().split(/\s+/)[0];
  const link = absolute(b.url);
  const paras = String(b.body)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const unsub = unsubscribeUrl(email);
  const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:${INK};color:#ffffff;padding:18px 24px;border-bottom:5px solid ${ORANGE}">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.9">Spritz Connection</div>
<div style="font-size:22px;font-weight:800;margin-top:6px;line-height:1.25">${esc(b.title)}</div></td></tr>
<tr><td style="padding:22px 24px 4px">${first ? `<p style="margin:0 0 12px;font-size:15px">Ciao ${esc(first)},</p>` : ""}${paras}</td></tr>
<tr><td align="center" style="padding:10px 24px 22px"><a href="${esc(link)}" style="display:inline-block;background:${ORANGE};color:#fff;border-radius:12px;padding:14px 26px;font-weight:700;font-size:16px;text-decoration:none">${b.url ? "Voir dans l'app" : "Ouvrir l'app"}</a></td></tr>
<tr><td style="padding:16px 24px 22px;font-size:12px;color:${MUTED};line-height:1.5;border-top:1px solid #EADFC4">
A presto ! — Spritz Connection<br><br>
Tu reçois cet email car tu as un compte sur l'app Spritz Connection. <a href="${esc(unsub)}" style="color:${MUTED}">Se désinscrire</a>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${first ? `Ciao ${first},\n\n` : ""}${b.body}\n\n${link}\n\nA presto ! — Spritz Connection\nSe désinscrire : ${unsub}`;
  return { subject: b.title, html, text, unsubscribe: unsub };
}

async function sendEmails(supabaseAdmin, b) {
  const [{ data: profiles }, { data: optouts }] = await Promise.all([
    supabaseAdmin.from("profiles").select("name, email"),
    supabaseAdmin.from("newsletter_optouts").select("email")
  ]);
  const off = new Set((optouts || []).map((o) => String(o.email).toLowerCase()));
  const seen = new Set();
  const targets = [];
  for (const p of profiles || []) {
    const email = String(p.email || "").trim().toLowerCase();
    if (!email || off.has(email) || seen.has(email)) continue;
    seen.add(email);
    targets.push({ name: p.name, email });
  }
  let sent = 0;
  let failed = 0;
  // Par paquets de 8 pour rester rapide sans saturer Brevo
  for (let i = 0; i < targets.length; i += 8) {
    const results = await Promise.all(
      targets.slice(i, i + 8).map((t) => {
        const content = buildBroadcastEmail(b, t);
        return sendViaBrevo({ to: t.email, toName: t.name || undefined, ...content, tag: "message-a-tous" });
      })
    );
    results.forEach((r) => (r?.ok ? sent++ : failed++));
  }
  return { sent, failed };
}

// Crée le message et l'envoie sur les canaux choisis
export async function sendBroadcast(supabaseAdmin, input) {
  const title = String(input.title || "").trim().slice(0, 80);
  const body = String(input.body || "").trim().slice(0, 2000);
  if (!title || !body) throw Object.assign(new Error("Titre et message obligatoires"), { status: 400 });
  const channels = { push: !!input.push, banner: !!input.banner, email: !!input.email };
  if (!channels.push && !channels.banner && !channels.email) throw Object.assign(new Error("Choisis au moins un canal"), { status: 400 });

  const { data: b, error } = await supabaseAdmin
    .from("admin_broadcasts")
    .insert({ title, body, url: cleanLink(input.url), send_push: channels.push, send_email: channels.email, show_banner: channels.banner })
    .select("*")
    .single();
  if (error) throw error;

  const result = { id: b.id, push: null, email: null, errors: [] };
  if (channels.push) {
    try {
      result.push = await sendPush(supabaseAdmin, b);
      await supabaseAdmin.from("admin_broadcasts").update({ push_requested: true }).eq("id", b.id);
    } catch (err) {
      console.error("Push message à tous:", err);
      result.errors.push(`Notifications : ${err.message || err}`);
    }
  }
  if (channels.email) {
    try {
      result.email = await sendEmails(supabaseAdmin, b);
      await supabaseAdmin.from("admin_broadcasts").update({ email_sent: result.email.sent, email_failed: result.email.failed }).eq("id", b.id);
    } catch (err) {
      console.error("E-mail message à tous:", err);
      result.errors.push(`E-mails : ${err.message || err}`);
    }
  }
  return result;
}

export async function listBroadcasts(supabaseAdmin) {
  const { data } = await supabaseAdmin.from("admin_broadcasts").select("*").order("created_at", { ascending: false }).limit(20);
  return data || [];
}
