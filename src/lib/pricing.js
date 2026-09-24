// Règle de prix de l'entrée.
//
// Tant que l'association n'est pas créée (ADVANCE_PRICE_FOR_ALL = true) :
//   - réserver à l'avance dans l'app  → tout le monde paie le « tarif membre » (ex. 15 €)
//   - payer sur place le jour J       → « tarif non-membre » (ex. 20 €), affiché barré
//
// Une fois l'association créée, passer ADVANCE_PRICE_FOR_ALL à false (ici ET dans
// api/create-sumup-checkout.js) : le tarif membre sera alors réservé aux membres.
export const ADVANCE_PRICE_FOR_ALL = true;

export function onlineEntryPrice(event, isMember) {
  if (!event) return 0;
  const useMemberPrice = ADVANCE_PRICE_FOR_ALL || isMember;
  return Number(useMemberPrice ? event.price_member : event.price_nonmember) || 0;
}
