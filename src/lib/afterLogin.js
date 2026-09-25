// Mémorise la page où revenir après la connexion par lien magique.
// Double sécurité : la page est aussi passée dans l'adresse de retour de l'email,
// mais si Supabase la refuse (adresse non autorisée), on retombe sur l'accueil
// et on redirige depuis ce qui a été mémorisé ici.

const KEY = "spritz_after_login";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

// N'accepte que des chemins internes à l'app ("/event/…"), jamais une adresse externe
export function safeNextPath(value) {
  if (!value || typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function rememberAfterLogin(path) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    /* rien */
  }
}

export function takeAfterLogin() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const { path, at } = JSON.parse(raw);
    if (Date.now() - at > MAX_AGE_MS) return null;
    return safeNextPath(path);
  } catch {
    return null;
  }
}
