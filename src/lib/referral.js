// Programme de parrainage : capture du code ?ref=... dans l'URL au premier passage
// (avant même la connexion), puis "réclamé" une fois le compte connecté.

const KEY = "spritz_referral_code";

export function captureReferralFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (code) localStorage.setItem(KEY, code.trim().slice(0, 12));
  } catch {
    /* rien */
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
