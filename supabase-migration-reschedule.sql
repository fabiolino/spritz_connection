-- Report de billet (une seule fois par billet) : garde la date d'origine et le moment du report.
alter table public.registrations
  add column if not exists rescheduled_from uuid,
  add column if not exists rescheduled_at timestamptz;
