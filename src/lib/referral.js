// Programme de parrainage : capture du code ?ref=... dans l'URL au premier passage
// (avant même la connexion), puis "réclamé" une fois le compte connecté.

const KEY = "spritz_referral_code";
// Code gardé 30 jours pour attribuer les inscriptions (avec ou sans compte) au membre
// Spritz Crew dont on a suivi le lien — contrairement au code ci-dessus, il n'est pas
// effacé à la connexion.
const CREW_KEY = "spritz_crew_ref";
const CREW_TTL_MS = 30 * 24 * 3600 * 1000;

export function captureReferralFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (code) {
      const clean = code.trim().slice(0, 12);
      localStorage.setItem(KEY, clean);
      localStorage.setItem(CREW_KEY, JSON.stringify({ code: clean, at: Date.now() }));
    }
  } catch {
    /* rien */
  }
}

export function getCrewRef() {
  try {
    const raw = localStorage.getItem(CREW_KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw);
    if (!code || Date.now() - at > CREW_TTL_MS) return null;
    return code;
  } catch {
    return null;
  }
}

export function takeStoredReferralCode() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* rien */
  }
}
