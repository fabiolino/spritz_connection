// Le bouton « Espace administrateur » n'est montré qu'aux comptes de Fabio.
// L'espace reste protégé par le mot de passe admin (vérifié côté serveur) et
// accessible depuis n'importe quel appareil via l'adresse /admin.
const ADMIN_EMAILS = [
  "fabiocasilli@gmail.com",
  "fabio@fabiocasilli.com",
  "fabio@spritzconnection.fr"
];

export function isAdminUser(user) {
  const email = (user?.email || "").trim().toLowerCase();
  return ADMIN_EMAILS.includes(email);
}
