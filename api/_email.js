// Emails de confirmation (billet) envoyés via Brevo — pas une fonction serverless (le "_" l'exclut).
//
// Variables d'environnement Vercel :
//   BREVO_API_KEY       → clé API Brevo (Brevo > SMTP & API > Clés API)
//   BREVO_SENDER_EMAIL  → (facultatif) adresse d'expédition validée dans Brevo,
//                         par défaut fabiocasilli@gmail.com
//   PUBLIC_APP_URL      → déjà utilisée pour SumUp (https://spritz-connection.vercel.app)
//
// Sans BREVO_API_KEY, rien n'est envoyé et l'inscription fonctionne normalement.
// Un email ne bloque jamais une inscription : toute erreur est seulement journalisée.

const DEFAULT_SENDER = "fabiocasilli@gmail.com";
const ORANGE = "#F05A19"; // charte 30/09 : navy / orange / jaune sur crème
const INK = "#062B49";
const MUTED = "#5C6B7A";
const CREAM = "#FFFAF0";

function appUrl() {
  return (process.env.PUBLIC_APP_URL || "https://spritz-connection.vercel.app").replace(/\/$/, "");
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function euro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("fr-FR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
}

function parisDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function button(href, label, primary = true) {
  return `<a href="${esc(href)}" style="display:inline-block;background:${primary ? ORANGE : "#ffffff"};color:${
    primary ? "#ffffff" : ORANGE
  };border:2px solid ${ORANGE};border-radius:12px;padding:12px 20px;font-weight:700;font-size:15px;text-decoration:none">${esc(label)}</a>`;
}

// Contenu de l'email pour une inscription
export function buildTicketEmail({ reg, event, options, recipientName, hasAccount }) {
  const quantity = reg.quantity || 1;
  const ticketUrl = `${appUrl()}/ticket/${reg.id}`;
  const firstName = String(recipientName || "").trim().split(/\s+/)[0] || "";
  const isFree = Number(reg.amount) === 0;
  const toPay = reg.external && !reg.paid;
  const group = quantity > 1 ? ` pour ${quantity} personnes` : "";

  let status;
  if (isFree) status = `✅ Ton inscription${group} est confirmée.`;
  else if (toPay) status = `📝 Ta réservation${group} est enregistrée. Il reste à régler <strong>${euro(reg.amount)}</strong> via SumUp.`;
  else status = `✅ Ton paiement de <strong>${euro(reg.amount)}</strong>${group} est confirmé.`;

  const names = (reg.attendee_names || []).filter(Boolean);
  const optionLines = (options || [])
    .map((o) => `${(o.quantity || 1) > 1 ? `${o.quantity} × ` : ""}${esc(o.label)}`)
    .join(", ");

  const subject = `${toPay ? "Ta réservation" : "Ton billet"} — ${event.title} (code ${reg.ticket_code})`;

  const html = `<!DOCTYPE html>
<html lang="fr"><body style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden">
  <tr><td style="background:${INK};color:#ffffff;padding:18px 22px;border-bottom:5px solid ${ORANGE}">
    <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.9">Spritz Connection</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px">${esc(event.title)}</div>
  </td></tr>
  <tr><td style="padding:20px 22px 6px;font-size:15px;line-height:1.55">
    <p style="margin:0 0 12px">Ciao${firstName ? " " + esc(firstName) : ""} ! 🍹</p>
    <p style="margin:0 0 14px">${status}</p>
    <p style="margin:0 0 4px">📅 ${esc(parisDate(event.event_date))}</p>
    ${event.address ? `<p style="margin:0 0 4px">📍 ${esc(event.address)}</p>` : ""}
    ${quantity > 1 ? `<p style="margin:0 0 4px">👥 Billet pour ${quantity} personnes${names.length ? ` — avec ${esc(names.join(", "))}` : ""}</p>` : ""}
    ${optionLines ? `<p style="margin:0 0 4px">➕ ${optionLines}</p>` : ""}
  </td></tr>
  <tr><td align="center" style="padding:14px 22px 6px">
    <div style="border:2px dashed #EADFC4;border-radius:14px;padding:14px">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MUTED}">${toPay ? "Code de réservation" : "Code à présenter à l'entrée"}</div>
      <div style="font-family:Menlo,Consolas,monospace;font-size:34px;font-weight:800;letter-spacing:6px;margin-top:4px">${esc(reg.ticket_code)}</div>
    </div>
  </td></tr>
  <tr><td align="center" style="padding:16px 22px 4px">
    ${toPay && event.sumup_link ? `<div style="margin-bottom:10px">${button(event.sumup_link, `Payer ${euro(reg.amount)} via SumUp`)}</div>` : ""}
    ${button(ticketUrl, "Voir mon billet", !(toPay && event.sumup_link))}
  </td></tr>
  <tr><td style="padding:22px 22px 6px">
    <div style="background:${CREAM};border-radius:14px;padding:16px">
      <div style="font-size:16px;font-weight:700;margin-bottom:6px">📲 Ne rate aucune soirée</div>
      <div style="font-size:14px;line-height:1.55;color:${INK}">
        Installe l'app Spritz Connection pour être au courant de tous nos événements, retrouver tes billets et recevoir les infos de dernière minute.
        ${hasAccount ? "" : " Crée ton compte en 10 secondes (juste ton email) pour recevoir les notifications."}
      </div>
      <div style="font-size:13px;line-height:1.5;color:${MUTED};margin-top:8px">
        <strong>iPhone :</strong> ouvre le lien dans Safari, touche « Partager » puis « Sur l'écran d'accueil ».<br>
        <strong>Android :</strong> ouvre le lien dans Chrome, puis « Installer l'application ».
      </div>
      <div style="margin-top:12px">${button(`${appUrl()}/${hasAccount ? "" : "login"}`, hasAccount ? "Ouvrir l'app" : "Installer l'app et créer mon compte", false)}</div>
    </div>
  </td></tr>
  <tr><td style="padding:16px 22px 22px;font-size:12px;color:${MUTED};line-height:1.5">
    Garde cet email : il vaut billet. Une question ? Réponds simplement à ce message.<br>A presto ! — Fabio, Spritz Connection
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Ciao${firstName ? " " + firstName : ""} !`,
    status.replace(/<[^>]+>/g, ""),
    `${event.title} — ${parisDate(event.event_date)}`,
    event.address ? `Lieu : ${event.address}` : "",
    quantity > 1 ? `Billet pour ${quantity} personnes${names.length ? ` (avec ${names.join(", ")})` : ""}` : "",
    `Code : ${reg.ticket_code}`,
    toPay && event.sumup_link ? `Payer : ${event.sumup_link}` : "",
    `Ton billet : ${ticketUrl}`,
    "",
    `Installe l'app pour être au courant de tous nos événements : ${appUrl()}`
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

async function sendViaBrevo({ to, toName, subject, html, text }) {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { skipped: "no-key" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "Spritz Connection", email: process.env.BREVO_SENDER_EMAIL || DEFAULT_SENDER },
        replyTo: { email: process.env.BREVO_SENDER_EMAIL || DEFAULT_SENDER, name: "Spritz Connection" },
        to: [{ email: to, ...(toName ? { name: toName } : {}) }],
        subject,
        htmlContent: html,
        textContent: text,
        tags: ["billet"]
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { error: `Brevo ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { error: String(err?.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

// Envoie le billet d'une inscription par email, une seule fois (sauf force: true pour un renvoi).
// Renvoie true si un email est parti.
export async function sendRegistrationEmail(supabaseAdmin, registrationId, { force = false } = {}) {
  try {
    if (!process.env.BREVO_API_KEY) return false;

    // On "réserve" l'envoi pour ne jamais envoyer deux fois (webhook + page billet en parallèle)
    let reg;
    if (force) {
      const { data } = await supabaseAdmin.from("registrations").select("*").eq("id", registrationId).maybeSingle();
      reg = data;
    } else {
      const { data } = await supabaseAdmin
        .from("registrations")
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq("id", registrationId)
        .is("confirmation_sent_at", null)
        .select("*");
      reg = data && data[0];
    }
    if (!reg || !reg.event_id) return false;
    if (!(reg.paid || reg.external)) return false; // paiement en ligne pas encore confirmé

    const release = () =>
      force ? null : supabaseAdmin.from("registrations").update({ confirmation_sent_at: null }).eq("id", reg.id);

    let to = reg.guest_email;
    let name = reg.guest_name;
    if (reg.user_id) {
      const { data: profile } = await supabaseAdmin.from("profiles").select("name, email").eq("id", reg.user_id).maybeSingle();
      to = to || profile?.email;
      name = name || profile?.name;
      if (!to) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(reg.user_id);
        to = u?.user?.email;
      }
    }
    if (!to) {
      await release();
      return false;
    }

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("title, event_date, address, sumup_link")
      .eq("id", reg.event_id)
      .maybeSingle();
    if (!event) {
      await release();
      return false;
    }
    const { data: options } = await supabaseAdmin
      .from("registration_options")
      .select("label, quantity")
      .eq("registration_id", reg.id);

    const content = buildTicketEmail({ reg, event, options, recipientName: name, hasAccount: !!reg.user_id });
    const result = await sendViaBrevo({ to, toName: name, ...content });
    if (!result.ok) {
      console.error("Email billet non envoyé:", result.error || result.skipped);
      await release();
      return false;
    }
    if (force) {
      await supabaseAdmin.from("registrations").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", reg.id);
    }
    return true;
  } catch (err) {
    console.error("Erreur email billet:", err);
    return false;
  }
}
