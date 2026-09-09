-- À exécuter dans Supabase : SQL Editor > New query

alter table events
  add column if not exists is_free boolean default false,
  add column if not exists approved boolean default true,
  add column if not exists organizer_contact text;

-- S'assure que les événements déjà existants restent visibles
update events set approved = true where approved is null;
