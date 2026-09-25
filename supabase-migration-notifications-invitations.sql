-- Spritz Connection — notifications push + invitations par lien (WhatsApp / SMS)
-- Déjà appliquée sur le projet Supabase le 25/09/2026 ; conservée ici pour l'historique.
-- Les clés secrètes (VAPID, secret du webhook) sont insérées à part dans private_config,
-- jamais dans ce fichier.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 1. Configuration privée (lisible uniquement côté serveur, via la clé service_role)
create table if not exists public.private_config (
  key text primary key,
  value text not null
);
alter table public.private_config enable row level security;
revoke all on public.private_config from anon, authenticated;

-- 2. Abonnements aux notifications (un par appareil / navigateur)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "gérer ses propres abonnements (lecture)" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "gérer ses propres abonnements (ajout)" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "gérer ses propres abonnements (suppression)" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- 3. Préférences : quels types de notifications chaque personne veut recevoir
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  new_events boolean not null default true,
  invites boolean not null default true,
  chat boolean not null default true,
  reminders boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
create policy "préférences perso (lecture)" on public.notification_prefs
  for select using (auth.uid() = user_id);
create policy "préférences perso (ajout)" on public.notification_prefs
  for insert with check (auth.uid() = user_id);
create policy "préférences perso (modif)" on public.notification_prefs
  for update using (auth.uid() = user_id);

-- 4. Jetons d'invitation pour les événements privés (un lien secret par événement)
create table if not exists public.event_invite_tokens (
  event_id uuid primary key references public.events(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);
alter table public.event_invite_tokens enable row level security;
revoke all on public.event_invite_tokens from anon, authenticated;

-- Invitation obtenue en ouvrant un lien (pas de notification "tu es invité" dans ce cas)
alter table public.event_invites add column if not exists via_link boolean not null default false;

-- 5. Appel de la fonction d'envoi (Supabase Edge Function "send-push")
create or replace function public.notify_push(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  secret text;
begin
  select value into secret from public.private_config where key = 'hook_secret';
  if secret is null then return; end if;
  perform net.http_post(
    url := 'https://uejfiasqzvumxtdqlngg.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', secret),
    body := payload
  );
exception when others then
  -- Une notification ratée ne doit jamais bloquer la création d'un événement ou d'un message
  raise warning 'notify_push: %', sqlerrm;
end;
$$;
revoke all on function public.notify_push(jsonb) from public, anon, authenticated;

-- Nouvel événement public publié (création directe ou approbation d'un événement proposé)
create or replace function public.trg_event_published()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.approved, false)
     and coalesce(new.visibility, 'public') = 'public'
     and new.event_date > now()
     and (tg_op = 'INSERT' or coalesce(old.approved, false) = false) then
    perform public.notify_push(jsonb_build_object('type', 'new_event', 'event_id', new.id));
  end if;
  return new;
end;
$$;
drop trigger if exists push_event_published on public.events;
create trigger push_event_published
  after insert or update of approved on public.events
  for each row execute function public.trg_event_published();

-- Invitation à un événement privé
create or replace function public.trg_event_invited()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.via_link then
    perform public.notify_push(jsonb_build_object('type', 'invite', 'event_id', new.event_id, 'user_id', new.invited_user_id));
  end if;
  return new;
end;
$$;
drop trigger if exists push_event_invited on public.event_invites;
create trigger push_event_invited
  after insert on public.event_invites
  for each row execute function public.trg_event_invited();

-- Message dans la discussion d'un événement (la fonction ne notifie que les messages de l'organisateur)
create or replace function public.trg_chat_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_push(jsonb_build_object('type', 'chat', 'message_id', new.id));
  return new;
end;
$$;
drop trigger if exists push_chat_message on public.messages;
create trigger push_chat_message
  after insert on public.messages
  for each row execute function public.trg_chat_message();

-- Rappel la veille : tous les jours à 8h UTC (10h à Paris l'été, 9h l'hiver)
select cron.schedule('push-rappels-veille', '0 8 * * *', $$select public.notify_push('{"type":"reminders"}'::jsonb)$$);

-- 6. Fabio (comptes listés dans private_config.admin_user_ids) voit aussi les événements privés
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.uid()::text = any(string_to_array(replace((select value from private_config where key = 'admin_user_ids'), ' ', ''), ',')), false);
$$;
revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to anon, authenticated;

create policy "événements privés visibles par l'admin" on public.events
  for select using (public.is_app_admin());
