// Enregistre qu'un membre connecté utilise l'app, et s'il l'a installée
// (écran d'accueil iPhone/Android, ou APK Android). Sert à la vue Admin « Membres & Spritz Crew ».
// Une fois par jour et par appareil au maximum.
import { supabase } from "./supabaseClient";
import { isIos, isStandalone } from "./push";

export function installedPlatform() {
  try {
    if (window.Capacitor?.isNativePlatform?.()) return "apk-android";
    if (isStandalone()) {
      if (isIos()) return "iphone";
      if (/android/i.test(navigator.userAgent)) return "android";
      return "ordinateur";
    }
  } catch {
    /* rien */
  }
  return null; // ouverte dans le navigateur, pas installée
}

export async function recordAppOpen(userId) {
  if (!userId) return;
  const platform = installedPlatform();
  const today = new Date().toISOString().slice(0, 10);
  const key = `spritz_app_open_${userId}`;
  const stamp = `${today}|${platform || "web"}`;
  try {
    if (localStorage.getItem(key) === stamp) return;
  } catch {
    /* stockage indisponible : on enregistre quand même */
  }
  const { error } = await supabase.rpc("record_app_open", { p_platform: platform });
  // Ajoute (une fois par jour au plus) l'email du compte à la liste Brevo « Spritz Connection »
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      fetch("/api/event-attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "subscribe-self" })
      }).catch(() => {});
    }
  } catch {
    /* rien */
  }
  if (!error) {
    try {
      localStorage.setItem(key, stamp);
    } catch {
      /* rien */
    }
  }
}
