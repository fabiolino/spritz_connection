-- Déjà appliquée le 07/10/2026 dans Supabase (ne pas rejouer : sans danger si c'est le cas).
-- Chaque lieu peut encaisser sur son propre compte SumUp.
alter table public.venues add column if not exists sumup_account text;
alter table public.registrations add column if not exists sumup_account text;
