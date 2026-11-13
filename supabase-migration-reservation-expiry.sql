-- Réservations temporaires : les réservations externes non réglées expirent après 15 minutes.
alter table public.registrations
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists reservation_expired_at timestamptz;

create index if not exists registrations_pending_reservation_expiry_idx
  on public.registrations (reservation_expires_at)
  where external = true and paid = false and reservation_expired_at is null;

create schema if not exists private;

create or replace function private.expire_pending_reservations()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expired_count integer := 0;
begin
  with expired as (
    update public.registrations
       set reservation_expired_at = now()
     where external = true
       and paid = false
       and reservation_expired_at is null
       and reservation_expires_at is not null
       and reservation_expires_at <= now()
    returning event_id, coalesce(quantity, 1) as quantity
  ),
  totals as (
    select event_id, sum(quantity)::integer as quantity
      from expired
     where event_id is not null
     group by event_id
  ),
  updated_events as (
    update public.events e
       set taken = greatest(coalesce(e.taken, 0) - totals.quantity, 0)
      from totals
     where e.id = totals.event_id
    returning e.id
  )
  select count(*)::integer into expired_count from expired;

  return expired_count;
end;
$$;

revoke all on function private.expire_pending_reservations() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.expire_pending_reservations() to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-pending-reservations') then
    perform cron.unschedule(jobid)
      from cron.job
     where jobname = 'expire-pending-reservations';
  end if;
  perform cron.schedule(
    'expire-pending-reservations',
    '* * * * *',
    'select private.expire_pending_reservations();'
  );
end;
$$;
