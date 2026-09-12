// Utilitaire partagé — convertit une adresse texte en coordonnées GPS
// via Nominatim (OpenStreetMap), gratuit et sans clé API.
// N'échoue jamais bruyamment : renvoie {latitude: null, longitude: null}
// si l'adresse n'est pas trouvée, plutôt que de bloquer la création de l'événement.

export async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SpritzConnectionApp/1.0 (contact: fabiocasilli@gmail.com)" }
    });
    const data = await res.json();
    if (data && data[0]) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error("Erreur géocodage:", err);
  }
  return { latitude: null, longitude: null };
}
