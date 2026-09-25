// Supabase Edge Function "send-push" — envoie les notifications de Spritz Connection.
// Appelée uniquement par la base (déclencheurs + tâche planifiée), avec un secret partagé.
// Déployée sur Supabase ; ce fichier sert de copie de référence dans le dépôt.
//
// Quatre types de notifications :
//   new_event  → nouvel événement public publié        (préférence new_events)
//   invite     → invitation à un événement privé        (préférence invites)
//   chat       → message de l'organisateur / de Fabio   (préférence chat, inscrits seulement)
//   reminders  → rappel la veille de l'événement        (préférence reminders, inscrits seulement)

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Prefs = "new_events" | "invites" | "chat" | "reminders";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

let config: Record<string, string> | null = null;
async function getConfig() {
  if (config) return config;
  const { data, error } = await supabase.from("private_config").select("key, value");
  if (error) throw error;
  config = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  webpush.setVapidDetails(config.vapid_subject, config.vapid_public, config.vapid_private);
  return config;
}

function parisDate(iso: string, withDay = true) {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    ...(withDay ? { weekday: "long", day: "numeric", month: "long" } : {}),
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Garde les personnes qui n'ont pas désactivé ce type (pas de ligne = tout activé)
async function filterByPref(userIds: string[], pref: Prefs) {
  if (userIds.length === 0) return [];
  const { data } = await supabase.from("notification_prefs").select(`user_id, ${pref}`).in("user_id", userIds);
  const off = new Set((data || []).filter((r: any) => r[pref] === false).map((r: any) => r.user_id));
  return userIds.filter((id) => !off.has(id));
}

async function sendTo(userIds: string[] | "all", payload: { title: string; body: string; url: string; tag?: string }) {
  let query = supabase.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth");
  if (userIds !== "all") {
    if (userIds.length === 0) return 0;
    query = query.in("user_id", userIds);
  }
  const { data: subs, error } = await query;
  if (error) throw error;

  let sent = 0;
  const body = JSON.stringify(payload);
  await Promise.all(
    (subs || []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24 });
        sent++;
      } catch (err: any) {
        // Abonnement expiré ou révoqué : on le supprime pour ne plus réessayer
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("Échec envoi push", s.endpoint.slice(0, 60), err?.statusCode, err?.body || err?.message);
        }
      }
    })
  );
  return sent;
}

// Inscrits confirmés à un événement (paiement fait, inscription gratuite, ou réservation externe)
async function registrantIds(eventId: string) {
  const { data } = await supabase
    .from("registrations")
    .select("user_id")
    .eq("event_id", eventId)
    .or("paid.eq.true,external.eq.true")
    .not("user_id", "is", null);
  return [...new Set((data || []).map((r) => r.user_id as string))];
}

async function handle(msg: any) {
  const cfg = await getConfig();

  if (msg.type === "new_event") {
    const { data: ev } = await supabase.from("events").select("id, title, event_date, organizer_id, visibility").eq("id", msg.event_id).single();
    if (!ev || ev.visibility === "private") return 0;
    const { data: subs } = await supabase.from("push_subscriptions").select("user_id");
    const { data: blocks } = await supabase.from("event_blocks").select("blocked_user_id").eq("event_id", ev.id);
    const blocked = new Set((blocks || []).map((b) => b.blocked_user_id));
    let ids = [...new Set((subs || []).map((s) => s.user_id as string))].filter((id) => !blocked.has(id) && id !== ev.organizer_id);
    ids = await filterByPref(ids, "new_events");
    return sendTo(ids, {
      title: "🍹 Nouvel événement",
      body: `${ev.title} — ${parisDate(ev.event_date)}`,
      url: `/event/${ev.id}`,
      tag: `event-${ev.id}`
    });
  }

  if (msg.type === "invite") {
    const { data: ev } = await supabase.from("events").select("id, title, event_date").eq("id", msg.event_id).single();
    if (!ev) return 0;
    const ids = await filterByPref([msg.user_id], "invites");
    return sendTo(ids, {
      title: "🔒 Tu es invité·e !",
      body: `${ev.title} — ${parisDate(ev.event_date)}`,
      url: `/event/${ev.id}`,
      tag: `invite-${ev.id}`
    });
  }

  if (msg.type === "chat") {
    const { data: m } = await supabase.from("messages").select("id, event_id, user_id, name, text").eq("id", msg.message_id).single();
    if (!m) return 0;
    const { data: ev } = await supabase.from("events").select("id, title, organizer_id").eq("id", m.event_id).single();
    if (!ev) return 0;
    const admins = (cfg.admin_user_ids || "").split(",").map((s) => s.trim()).filter(Boolean);
    const fromOrganizer = m.user_id && (m.user_id === ev.organizer_id || admins.includes(m.user_id));
    if (!fromOrganizer) return 0; // seuls les messages de l'organisateur déclenchent une notification
    let ids = (await registrantIds(ev.id)).filter((id) => id !== m.user_id);
    ids = await filterByPref(ids, "chat");
    const text = m.text.length > 120 ? m.text.slice(0, 117) + "…" : m.text;
    return sendTo(ids, {
      title: `💬 ${ev.title}`,
      body: `${m.name || "L'organisateur"} : ${text}`,
      url: `/event/${ev.id}/chat`,
      tag: `chat-${ev.id}`
    });
  }

  if (msg.type === "reminders") {
    // Événements qui ont lieu demain (jour calendaire à Paris)
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });
    const tomorrow = fmt.format(new Date(Date.now() + 24 * 3600 * 1000));
    const { data: events } = await supabase
      .from("events")
      .select("id, title, event_date, address")
      .gte("event_date", new Date(Date.now()).toISOString())
      .lte("event_date", new Date(Date.now() + 48 * 3600 * 1000).toISOString());
    let total = 0;
    for (const ev of events || []) {
      if (fmt.format(new Date(ev.event_date)) !== tomorrow) continue;
      const ids = await filterByPref(await registrantIds(ev.id), "reminders");
      total += await sendTo(ids, {
        title: `⏰ C'est demain : ${ev.title}`,
        body: `Rendez-vous à ${parisDate(ev.event_date, false)}${ev.address ? " — " + ev.address : ""}`,
        url: `/event/${ev.id}`,
        tag: `reminder-${ev.id}`
      });
    }
    return total;
  }

  return 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });
  try {
    const cfg = await getConfig();
    if (!cfg.hook_secret || req.headers.get("x-hook-secret") !== cfg.hook_secret) {
      return new Response("Non autorisé", { status: 401 });
    }
    const msg = await req.json();
    const sent = await handle(msg);
    return Response.json({ ok: true, type: msg.type, sent });
  } catch (err) {
    console.error("send-push:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
});
