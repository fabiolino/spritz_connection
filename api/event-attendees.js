// Déploiement Vercel : /api/event-attendees
// Point d'entrée public autour d'un événement (regroupé pour rester sous la limite
// de 12 fonctions serverless du plan Hobby) :
//   POST {eventId}                              → participants inscrits (nom + photo uniquement)
//   POST {action:"invite-preview", eventId, token} → aperçu d'un événement privé pour qui a le lien
//   POST {action:"invite-accept", eventId, token}  → ajoute la personne connectée aux invités
//   GET  ?og=1&id=…[&invite=…]                   → page d'aperçu pour WhatsApp, Messenger, etc.
//        (vercel.json y redirige uniquement les robots de prévisualisation)

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORY_IMAGES = ["concert", "karaoke", "apero", "diner", "theatre", "danse", "autre"];

async function validToken(eventId, token) {
  if (!eventId || !token) return false;
  const { data } = await supabaseAdmin
    .from("event_invite_tokens")
    .select("token")
    .eq("event_id", eventId)
    .maybeSingle();
  return !!data && data.token === token;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

async function renderPreview(req, res) {
  const origin = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
  const { id, invite } = req.query;
  let title = "Spritz Connection";
  let description = "Soirées italiennes à Paris — apéros, concerts, dîners. Inscris-toi en quelques secondes.";
  let image = `${origin}/og/default.jpg`;
  let url = origin;

  if (id && /^[0-9a-f-]{36}$/i.test(String(id))) {
    url = `${origin}/event/${id}${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`;
    const { data: ev } = await supabaseAdmin
      .from("events")
      .select("title, event_date, address, category, visibility, is_free, price_member")
      .eq("id", id)
      .maybeSingle();
    if (ev) {
      const isPrivate = ev.visibility === "private";
      const allowed = !isPrivate || (await validToken(id, invite));
      if (allowed) {
        title = `${isPrivate ? "🔒 " : ""}${ev.title} — Spritz Connection`;
        const place = ev.address ? ev.address.split(",").slice(-1)[0].trim() : "";
        const price = ev.is_free ? "Gratuit" : ev.price_member ? `dès ${Number(ev.price_member)} €` : "";
        description = [parisDate(ev.event_date), place, price].filter(Boolean).join(" · ");
        if (CATEGORY_IMAGES.includes(ev.category)) image = `${origin}/og/${ev.category}.jpg`;
      } else {
        title = "🔒 Invitation privée — Spritz Connection";
        description = "Un événement sur invitation. Ouvre le lien reçu pour voir les détails.";
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Spritz Connection" />
<meta property="og:locale" content="fr_FR" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
</head><body><a href="${escapeHtml(url)}">${escapeHtml(title)}</a></body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).send(html);
}

export default async function handler(req, res) {
  if (req.method === "GET" && req.query?.og) {
    try {
      return await renderPreview(req, res);
    } catch (err) {
      console.error("Erreur aperçu OG:", err);
      return res.status(200).send("<!DOCTYPE html><title>Spritz Connection</title>");
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { eventId, action, token } = req.body || {};
  if (!eventId) {
    return res.status(400).json({ error: "eventId manquant" });
  }

  try {
    if (action === "invite-preview") {
      if (!(await validToken(eventId, token))) {
        return res.status(404).json({ error: "Lien d'invitation invalide ou expiré" });
      }
      const { data: ev } = await supabaseAdmin
        .from("events")
        .select("id, title, organizer, description, event_date, address, category, is_free, price_member, price_nonmember, seats, taken, visibility")
        .eq("id", eventId)
        .maybeSingle();
      if (!ev) return res.status(404).json({ error: "Événement introuvable" });
      return res.status(200).json({ event: ev });
    }

    if (action === "invite-accept") {
      if (!(await validToken(eventId, token))) {
        return res.status(404).json({ error: "Lien d'invitation invalide ou expiré" });
      }
      const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const { data: userData } = jwt ? await supabaseAdmin.auth.getUser(jwt) : { data: null };
      const userId = userData?.user?.id;
      if (!userId) return res.status(401).json({ error: "Connecte-toi pour accepter l'invitation" });

      const { data: blocked } = await supabaseAdmin
        .from("event_blocks")
        .select("id")
        .eq("event_id", eventId)
        .eq("blocked_user_id", userId)
        .maybeSingle();
      if (blocked) return res.status(403).json({ error: "Cette invitation n'est pas disponible pour ton compte." });

      const { error } = await supabaseAdmin
        .from("event_invites")
        .upsert({ event_id: eventId, invited_user_id: userId, via_link: true }, { onConflict: "event_id,invited_user_id", ignoreDuplicates: true });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    // Par défaut : liste des participants inscrits et payés (nom + photo uniquement)
    const { data: regs, error } = await supabaseAdmin
      .from("registrations")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("paid", true)
      .not("user_id", "is", null)
      .limit(60);

    if (error) throw error;

    const userIds = [...new Set((regs || []).map((r) => r.user_id))];
    if (userIds.length === 0) {
      return res.status(200).json({ attendees: [] });
    }

    const { data: profiles, error: profError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, photo_url")
      .in("id", userIds);

    if (profError) throw profError;

    const attendees = (profiles || []).map((p) => ({
      name: p.name || p.email?.split("@")[0] || "Participant",
      photo_url: p.photo_url || null
    }));

    return res.status(200).json({ attendees });
  } catch (err) {
    console.error("Erreur event-attendees:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
