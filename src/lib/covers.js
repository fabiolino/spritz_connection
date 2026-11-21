// Couverture d'une soirée (charte « Visuels de soirée », 21/11/2026) :
// 1. la photo choisie à la main par l'administrateur ;
// 2. sinon, la photo tirée au hasard dans « Couvertures validées » (Drive),
//    attribuée une fois pour toutes à la soirée (events.auto_cover_id) ;
// 3. sinon, l'image par défaut de la catégorie.
export function driveImage(id, width = 1600) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`;
}

export function eventCover(event, category) {
  if (event?.cover_photo_url) return event.cover_photo_url;
  if (event?.auto_cover_id) return driveImage(event.auto_cover_id);
  return category?.default_cover_url || null;
}
