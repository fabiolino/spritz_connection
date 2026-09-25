// Notifications push (Web Push) — activation, désactivation, préférences.
import { supabase } from "./supabaseClient";

// Clé publique VAPID (la clé privée correspondante est stockée côté serveur uniquement)
const VAPID_PUBLIC_KEY = "BDsTEbwC_Q4tzO1eu5Y9-Rosp6wm2Z2tCEOWsFnXNaC3pfkR3YLR0uZZYRlXVXagRE7FMgHsoZixTwJw0iwUlTg";

export const PREF_LABELS = [
  { key: "new_events", label: "Nouveaux événements", hint: "Dès qu'une soirée est publiée" },
  { key: "invites", label: "Invitations", hint: "Quand tu es invité·e à un événement privé" },
  { key: "chat", label: "Infos de l'organisateur", hint: "Messages de dernière minute sur tes événements" },
  { key: "reminders", label: "Rappel la veille", hint: "Pour les événements où tu es inscrit·e" }
];

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

// "ok" : possible ici · "ios-install" : iPhone, il faut d'abord installer l'app · "unsupported"
export function pushSupport() {
  const hasApi = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (hasApi) return "ok";
  if (isIos() && !isStandalone()) return "ios-install";
  return "unsupported";
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getRegistration() {
  return navigator.serviceWorker.ready;
}

// L'appareil actuel est-il abonné (et la permission toujours accordée) ?
export async function isSubscribed() {
  if (pushSupport() !== "ok" || Notification.permission !== "granted") return false;
  const reg = await getRegistration();
  return !!(await reg.pushManager.getSubscription());
}

export async function enablePush(userId) {
  if (pushSupport() !== "ok") throw new Error("unsupported");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");

  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }
  const json = sub.toJSON();
  // Remplace un éventuel ancien enregistrement de cet appareil
  await supabase.from("push_subscriptions").delete().eq("endpoint", json.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent.slice(0, 200)
  });
  if (error) throw error;
  return true;
}

export async function disablePush() {
  if (pushSupport() !== "ok") return;
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  }
}

export async function loadPrefs(userId) {
  const { data } = await supabase.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle();
  return {
    new_events: data?.new_events ?? true,
    invites: data?.invites ?? true,
    chat: data?.chat ?? true,
    reminders: data?.reminders ?? true
  };
}

export async function savePrefs(userId, prefs) {
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

// L'invite "Veux-tu être prévenu·e ?" n'est proposée qu'une fois par appareil si la personne la ferme
const DISMISS_KEY = "spritz_push_prompt_dismissed";
export function promptDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
export function dismissPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* rien */
  }
}
