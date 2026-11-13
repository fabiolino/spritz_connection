-- Suivi indépendant des emails de notification équipe / lieu.
-- Les anciens notified_at non nuls sont considérés comme traités afin d'éviter
-- de renvoyer automatiquement des notifications historiques après déploiement.
alter table public.registrations
  add column if not exists team_notified_at timestamptz,
  add column if not exists venue_notified_at timestamptz,
  add column if not exists team_notification_claimed_at timestamptz,
  add column if not exists venue_notification_claimed_at timestamptz;

update public.registrations
set
  team_notified_at = coalesce(team_notified_at, notified_at),
  venue_notified_at = coalesce(venue_notified_at, notified_at)
where notified_at is not null
  and (team_notified_at is null or venue_notified_at is null);

create index if not exists registrations_team_notification_pending_idx
  on public.registrations (created_at)
  where team_notified_at is null;

create index if not exists registrations_venue_notification_pending_idx
  on public.registrations (created_at)
  where venue_notified_at is null;
