-- Déjà exécuté sur ton projet Supabase — conservé ici pour référence / réplication.

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizer text not null,
  organizer_id uuid references auth.users(id),
  description text,
  event_date timestamptz not null,
  address text not null,
  phone text not null,
  price numeric not null default 0,
  seats int not null default 0,
  taken int not null default 0,
  created_at timestamptz default now()
);

create table registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id),
  option text not null,
  amount numeric not null,
  sumup_checkout_id text,
  paid boolean default false,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id),
  name text not null,
  role text not null,
  text text not null,
  created_at timestamptz default now()
);

create table co_organizer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  note text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table events enable row level security;
alter table registrations enable row level security;
alter table messages enable row level security;
alter table co_organizer_requests enable row level security;

create policy "events are public" on events for select using (true);
create policy "messages are public" on messages for select using (true);
create policy "anyone signed in can post a message" on messages
  for insert with check (auth.uid() = user_id);
