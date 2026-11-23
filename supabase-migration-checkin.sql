-- Contrôle des billets à l'entrée (QR code scanné depuis l'espace lieu) — appliquée le 23/11/2026
alter table registrations add column if not exists checked_in_at timestamptz;
alter table registrations add column if not exists checked_in_method text; -- scan | code | liste
