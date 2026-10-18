-- Notifications d'inscription, mails aux lieux et forum des lieux.
-- À passer dans Supabase (SQL Editor). Sans risque : ne fait qu'ajouter.

-- 1. Une notification par inscription, jamais deux
alter table registrations add column if not exists notified_at timestamptz;
-- Les inscriptions existantes ne déclenchent pas de notification a posteriori
update registrations set notified_at = coalesce(confirmation_sent_at, created_at) where notified_at is null;

-- 2. Compte de l'app qui représente un lieu (pour écrire dans le forum sous le nom du lieu)
alter table venues add column if not exists account_user_id uuid references auth.users(id) on delete set null;

-- Renvoie le nom du lieu si l'utilisateur connecté est le compte du lieu de cet événement
create or replace function my_venue_for_event(p_event_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select v.name
  from events e
  join venues v on v.id = e.venue_id
  where e.id = p_event_id and v.account_user_id = auth.uid()
  limit 1
$$;
grant execute on function my_venue_for_event(uuid) to authenticated;

-- 3. Forum : le rôle « lieu » est réservé au compte du lieu de l'événement
drop policy if exists "anyone signed in can post a message" on messages;
create policy "anyone signed in can post a message" on messages
  for insert with check (
    auth.uid() = user_id
    and (role <> 'lieu' or my_venue_for_event(event_id) is not null)
  );
