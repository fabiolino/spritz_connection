-- À EXÉCUTER SEULEMENT QUAND :
--   1. les 7 fichiers sont en ligne sur GitHub et déployés sur Vercel,
--   2. les clés SumUp de La Latteria sont dans Vercel (SUMUP_API_KEY_LATTERIA et
--      SUMUP_MERCHANT_CODE_LATTERIA) et l'app a été redéployée.
-- Supabase > SQL Editor : https://supabase.com/dashboard/project/uejfiasqzvumxtdqlngg/sql/new

-- 1. Le lieu La Latteria encaisse sur son propre compte
update public.venues set sumup_account = 'latteria' where id = 'b9e21281-e884-4271-89cb-fbfbfdc85204';

-- 2. Les 4 prochains « Aperitivo Italiano » : plus de billet d'entrée, plus de lien SumUp fixe
update public.events
set price_member = 0, price_nonmember = 0, sumup_link = null
where id in (
  '653ee9c7-8ea8-4ed1-9a50-f984786c4d46',  -- 15 oct
  '9c896bcb-cae2-4d79-a4c5-48eb20e5a6cc',  -- 13 nov
  'c5dfe643-0576-477b-b7b6-2900e55c585a',  -- 26 nov
  '0a468f8b-63f0-4d97-b3a5-319bb823f274'   -- 10 déc
);

-- 3. On remplace les anciennes options (Spritz / Tiramisù) par les 4 formules
delete from public.event_options
where event_id in (
  '653ee9c7-8ea8-4ed1-9a50-f984786c4d46',
  '9c896bcb-cae2-4d79-a4c5-48eb20e5a6cc',
  'c5dfe643-0576-477b-b7b6-2900e55c585a',
  '0a468f8b-63f0-4d97-b3a5-319bb823f274'
);

insert into public.event_options (event_id, label, price, onsite_price, created_at)
select e.id, f.label, f.price, f.onsite_price, now() + f.rank * interval '1 second'
from (values
  ('653ee9c7-8ea8-4ed1-9a50-f984786c4d46'::uuid),
  ('9c896bcb-cae2-4d79-a4c5-48eb20e5a6cc'::uuid),
  ('c5dfe643-0576-477b-b7b6-2900e55c585a'::uuid),
  ('0a468f8b-63f0-4d97-b3a5-319bb823f274'::uuid)
) as e(id)
cross join (values
  (1, 'Buffet à volonté + 1 verre (vin rouge, blanc ou prosecco)', 15.00, 20.00),
  (2, 'Buffet à volonté + 1 spritz à la place du vin',            18.50, 25.00),
  (3, 'Buffet à volonté + 1 verre + dessert',                     18.50, 25.00),
  (4, 'Buffet à volonté + 1 spritz + dessert',                    22.00, 30.00)
) as f(rank, label, price, onsite_price);

-- 4. Vérification : 4 lignes par événement, 16 au total
select e.event_date::date as date, o.label, o.price as prevente, o.onsite_price as sur_place
from public.events e join public.event_options o on o.event_id = e.id
where e.title = 'Aperitivo Italiano' and e.event_date > now()
order by e.event_date, o.created_at;
