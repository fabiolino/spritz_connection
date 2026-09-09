-- À exécuter dans Supabase : SQL Editor > New query

alter table events
  add column if not exists price_member numeric,
  add column if not exists price_nonmember numeric;

-- Reprend l'ancien tarif unique comme valeur de départ pour les deux colonnes
-- (à ajuster ensuite événement par événement dans la table).
update events
set price_member = price,
    price_nonmember = price
where price_member is null;
