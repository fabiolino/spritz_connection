-- En cas de problème après l'activation : on revient aux liens SumUp fixes et au billet à 15 € / 20 €.
-- (Les liens SumUp d'origine ne sont pas conservés : il faudra les remettre dans l'Admin de l'app.)
update public.events
set price_member = 15, price_nonmember = 20
where id in (
  '653ee9c7-8ea8-4ed1-9a50-f984786c4d46',
  '9c896bcb-cae2-4d79-a4c5-48eb20e5a6cc',
  'c5dfe643-0576-477b-b7b6-2900e55c585a',
  '0a468f8b-63f0-4d97-b3a5-319bb823f274'
);
delete from public.event_options
where event_id in (
  '653ee9c7-8ea8-4ed1-9a50-f984786c4d46',
  '9c896bcb-cae2-4d79-a4c5-48eb20e5a6cc',
  'c5dfe643-0576-477b-b7b6-2900e55c585a',
  '0a468f8b-63f0-4d97-b3a5-319bb823f274'
);
