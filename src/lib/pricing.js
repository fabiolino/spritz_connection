// Règle de prix de l'entrée.
//
// Tant que l'association n'est pas créée (ADVANCE_PRICE_FOR_ALL = true) :
//   - réserver à l'avance dans l'app  → tout le monde paie le « tarif membre » (ex. 15 €)
//   - payer sur place le jour J       → « tarif non-membre » (ex. 20 €), affiché barré
//
// Une fois l'association créée, passer ADVANCE_PRICE_FOR_ALL à false (ici ET dans
// api/create-sumup-checkout.js) : le tarif membre sera alors réservé aux membres.
export const ADVANCE_PRICE_FOR_ALL = true;

// Événement « à formules » (ex. Aperitivo Italiano) : pas de billet d'entrée séparé, chaque
// ligne de event_options est une formule complète (price = prévente, onsite_price = sur place)
// que le participant choisit avec une quantité. Le nombre de personnes = total des quantités.
// Règle : événement payant dont l'entrée est à 0 € (prévente ET sur place) et qui a des lignes.
// Même règle côté serveur (api/_registration.js : isFormulaEvent).
export function isFormulaEvent(event, options) {
  if (!event || event.is_free) return false;
  const noEntry = (Number(event.price_member) || 0) === 0 && (Number(event.price_nonmember) || 0) === 0;
  return noEntry && Array.isArray(options) && options.length > 0;
}

// Prix le plus bas parmi les formules (pour « dès X € »)
export function cheapestFormulaPrice(options) {
  const prices = (options || []).map((o) => Number(o.price) || 0);
  return prices.length ? Math.min(...prices) : 0;
}

export function onlineEntryPrice(event, isMember) {
  if (!event) return 0;
  const useMemberPrice = ADVANCE_PRICE_FOR_ALL || isMember;
  return Number(useMemberPrice ? event.price_member : event.price_nonmember) || 0;
}

// Prix des entrées pour un groupe (même règle que api/_registration.js) :
// un membre paie le tarif membre pour lui-même, ses accompagnants le tarif non-membre.
export function groupEntryPrice(event, isMember, quantity) {
  if (!event) return 0;
  const member = Number(event.price_member) || 0;
  const nonMember = Number(event.price_nonmember) || 0;
  const q = Math.max(1, quantity || 1);
  if (ADVANCE_PRICE_FOR_ALL) return member * q;
  if (isMember) return member + nonMember * (q - 1);
  return nonMember * q;
}
