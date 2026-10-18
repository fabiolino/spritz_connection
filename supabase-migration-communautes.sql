-- Spritz Connection — communautés de membres.
-- Chaque membre peut créer sa petite communauté, y inviter ses amis par un lien, voir lesquels
-- vont à une soirée et être prévenu quand l'un d'eux s'inscrit.
-- À passer dans Supabase (SQL Editor). Sans risque : ne fait qu'ajouter.
-- Les tables ne sont accessibles QUE par les fonctions ci-dessous (aucun accès direct).

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  join_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Visible par la communauté sur les soirées où j'ai réservé, et prévenir mes amis (modifiable)
  share_presence boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index if not exists community_members_user_idx on public.community_members(user_id);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
revoke all on public.communities from anon, authenticated;
revoke all on public.community_members from anon, authenticated;

-- Préférence de notification « un ami de ma communauté s'inscrit »
alter table public.notification_prefs add column if not exists community boolean not null default true;

-- Créer une communauté (le créateur en est le premier membre)
create or replace function public.create_community(p_name text)
returns table(id uuid, name text, join_code text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  c public.communities;
  mine int;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select count(*) into mine from communities where owner_id = auth.uid();
  if mine >= 5 then raise exception 'Tu peux créer 5 communautés au maximum.'; end if;
  insert into communities (owner_id, name) values (auth.uid(), btrim(p_name)) returning * into c;
  insert into community_members (community_id, user_id) values (c.id, auth.uid());
  return query select c.id, c.name, c.join_code;
end $$;

-- Aperçu d'une communauté à partir du lien (avant de la rejoindre)
create or replace function public.community_preview(p_code text)
returns table(name text, owner_name text, member_count bigint)
language sql stable security definer set search_path = public as $$
  select c.name, coalesce(p.name, 'Un membre'), (select count(*) from community_members m where m.community_id = c.id)
  from communities c left join profiles p on p.id = c.owner_id
  where c.join_code = p_code
$$;

-- Rejoindre une communauté avec son code
create or replace function public.join_community(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; n int;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select id into cid from communities where join_code = p_code;
  if cid is null then raise exception 'Cette communauté n''existe plus.'; end if;
  select count(*) into n from community_members where community_id = cid;
  if n >= 200 then raise exception 'Cette communauté est complète.'; end if;
  insert into community_members (community_id, user_id) values (cid, auth.uid()) on conflict do nothing;
  return cid;
end $$;

-- Mes communautés
create or replace function public.my_communities()
returns table(id uuid, name text, join_code text, is_owner boolean, member_count bigint, share_presence boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.join_code, (c.owner_id = auth.uid()), 
         (select count(*) from community_members x where x.community_id = c.id), m.share_presence
  from community_members m join communities c on c.id = m.community_id
  where m.user_id = auth.uid()
  order by c.created_at
$$;

-- Membres d'une de mes communautés
create or replace function public.community_members_list(p_id uuid)
returns table(user_id uuid, name text, photo_url text, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(p.name, 'Membre'), p.photo_url, (c.owner_id = m.user_id)
  from community_members m
  join communities c on c.id = m.community_id
  left join profiles p on p.id = m.user_id
  where m.community_id = p_id
    and exists (select 1 from community_members me where me.community_id = p_id and me.user_id = auth.uid())
  order by (c.owner_id = m.user_id) desc, p.name
$$;

create or replace function public.set_share_presence(p_id uuid, p_share boolean)
returns void language sql security definer set search_path = public as $$
  update community_members set share_presence = p_share where community_id = p_id and user_id = auth.uid()
$$;

-- Quitter une communauté (le créateur qui part passe la main au plus ancien membre ; la dernière personne ferme)
create or replace function public.leave_community(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid; nxt uuid;
begin
  select owner_id into v_owner from communities where id = p_id;
  delete from community_members where community_id = p_id and user_id = auth.uid();
  if v_owner = auth.uid() then
    select user_id into nxt from community_members where community_id = p_id order by joined_at limit 1;
    if nxt is null then delete from communities where id = p_id;
    else update communities set owner_id = nxt where id = p_id; end if;
  end if;
end $$;

-- Supprimer ma communauté (créateur uniquement)
create or replace function public.delete_community(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from communities where id = p_id and owner_id = auth.uid()
$$;

-- Retirer un membre (créateur uniquement)
create or replace function public.remove_community_member(p_id uuid, p_user uuid)
returns void language sql security definer set search_path = public as $$
  delete from community_members
  where community_id = p_id and user_id = p_user and user_id <> auth.uid()
    and exists (select 1 from communities c where c.id = p_id and c.owner_id = auth.uid())
$$;

-- Les gens de mes communautés qui ont réservé cette soirée (et qui acceptent de le montrer)
create or replace function public.friends_on_event(p_event_id uuid)
returns table(user_id uuid, name text, photo_url text, community_name text)
language sql stable security definer set search_path = public as $$
  select distinct on (m.user_id) m.user_id, coalesce(p.name, 'Membre'), p.photo_url, c.name
  from community_members me
  join community_members m on m.community_id = me.community_id and m.user_id <> me.user_id and m.share_presence
  join communities c on c.id = m.community_id
  left join profiles p on p.id = m.user_id
  where me.user_id = auth.uid()
    and exists (
      select 1 from registrations r
      where r.event_id = p_event_id and r.user_id = m.user_id and (r.paid or r.external)
    )
  order by m.user_id, c.name
$$;

grant execute on function public.community_preview(text) to anon, authenticated;
grant execute on function public.create_community(text), public.join_community(text), public.my_communities(),
  public.community_members_list(uuid), public.set_share_presence(uuid, boolean), public.leave_community(uuid),
  public.delete_community(uuid), public.remove_community_member(uuid, uuid), public.friends_on_event(uuid) to authenticated;

-- Notification : un membre vient de réserver -> ses amis de communauté sont prévenus (fonction send-push)
create or replace function public.trg_registration_community()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.event_id is not null and new.user_id is not null and (new.paid or new.external)
     and (tg_op = 'INSERT' or not (coalesce(old.paid, false) or coalesce(old.external, false))) then
    perform public.notify_push(jsonb_build_object('type', 'community_going', 'registration_id', new.id));
  end if;
  return new;
end $$;
drop trigger if exists push_community_going on public.registrations;
create trigger push_community_going
  after insert or update of paid, external on public.registrations
  for each row execute function public.trg_registration_community();
