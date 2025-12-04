-- EventHub – Supabase/PostgreSQL Schema
-- Dieses Skript im Supabase SQL Editor ausführen.

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Enums
create type public.user_role as enum ('user', 'admin', 'extern');
create type public.event_status as enum ('planned', 'consider', 'attended', 'cancelled');
create type public.cost_type as enum ('participant', 'booth');

-- Users (App-spezifische User, verknüpft mit auth.users)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  external_id uuid not null references auth.users (id) on delete cascade,
  email citext not null unique check (email like '%@immomio.de'),
  name text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.users is 'Application users mapped to Supabase auth.users';
comment on column public.users.external_id is 'FK to auth.users.id';

-- Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizer text,
  start_date date,
  end_date date,
  city text,
  location text,
  status public.event_status not null default 'planned',
  booked boolean not null default false,
  colleagues text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  cost_type public.cost_type not null,
  cost_value numeric(12,2) not null default 0,
  event_url text,
  notes text,
  linkedin_plan boolean not null default false,
  linkedin_note text,
  attachments text[] not null default '{}'::text[],
  publication_status boolean not null default false,
  created_by uuid references public.users(id) default public.current_app_user_id(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_created_by_idx on public.events (created_by);
create index if not exists events_status_idx on public.events (status);
create index if not exists events_start_date_idx on public.events (start_date);

-- Event History
create table if not exists public.event_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid references public.users(id),
  action text not null,
  "timestamp" timestamptz not null default timezone('utc', now()),
  details jsonb
);

create index if not exists event_history_event_id_idx on public.event_history (event_id);
create index if not exists event_history_user_id_idx on public.event_history (user_id);

-- Share Tokens
create table if not exists public.share_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  read_only boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users(id)
);

create index if not exists share_tokens_event_id_idx on public.share_tokens (event_id);
create index if not exists share_tokens_expires_at_idx on public.share_tokens (expires_at);

-- Kosten-View (für Summary-Endpunkt hilfreich)
create or replace view public.event_costs as
select
  e.id,
  e.title,
  e.organizer,
  e.start_date,
  e.cost_type,
  e.cost_value,
  e.colleagues,
  cardinality(e.colleagues) as colleagues_count,
  case
    when e.cost_type = 'participant' then e.cost_value * greatest(cardinality(e.colleagues), 0)
    when e.cost_type = 'booth' then e.cost_value
  end as total_cost,
  case
    when e.cost_type = 'booth' and cardinality(e.colleagues) > 0 then e.cost_value / cardinality(e.colleagues)
    when e.cost_type = 'participant' and cardinality(e.colleagues) > 0 then e.cost_value
    else 0
  end as cost_per_participant
from public.events e;

-- Helper-Funktionen für RLS
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.external_id = auth.uid()
  limit 1
$$;

create or replace function public.current_app_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.external_id = auth.uid()
  limit 1
$$;

-- RLS aktivieren
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.event_history enable row level security;
alter table public.share_tokens enable row level security;

-- RLS Policies: users
drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users
  for select
  using (external_id = auth.uid());

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users
  for update
  using (external_id = auth.uid())
  with check (external_id = auth.uid());

drop policy if exists "Admins can manage all users" on public.users;
create policy "Admins can manage all users"
  on public.users
  for all
  using (public.current_app_user_role() = 'admin')
  with check (public.current_app_user_role() = 'admin');

-- RLS Policies: events
drop policy if exists "Users can view own events or admins all" on public.events;
create policy "Users can view own events or admins all"
  on public.events
  for select
  using (
    exists (
      select 1 from public.users u
      where u.external_id = auth.uid()
        and (u.role = 'admin' or public.events.created_by = u.id)
    )
  );

drop policy if exists "Users can insert events for themselves" on public.events;
create policy "Users can insert events for themselves"
  on public.events
  for insert
  with check (
    exists (
      select 1 from public.users u
      where u.external_id = auth.uid()
        and (u.role = 'admin' or public.events.created_by = u.id)
    )
  );

drop policy if exists "Users can update own events or admins all" on public.events;
create policy "Users can update own events or admins all"
  on public.events
  for update
  using (
    exists (
      select 1 from public.users u
      where u.external_id = auth.uid()
        and (u.role = 'admin' or public.events.created_by = u.id)
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.external_id = auth.uid()
        and (u.role = 'admin' or public.events.created_by = u.id)
    )
  );

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events
  for delete
  using (public.current_app_user_role() = 'admin');

-- RLS Policies: event_history
drop policy if exists "Users can view history for own events or admins all" on public.event_history;
create policy "Users can view history for own events or admins all"
  on public.event_history
  for select
  using (
    exists (
      select 1
      from public.events e
      join public.users u on u.id = e.created_by
      where e.id = public.event_history.event_id
        and (u.external_id = auth.uid() or u.role = 'admin')
    )
  );

drop policy if exists "Users can insert history for own events or admins all" on public.event_history;
create policy "Users can insert history for own events or admins all"
  on public.event_history
  for insert
  with check (
    exists (
      select 1
      from public.events e
      join public.users u on u.id = e.created_by
      where e.id = public.event_history.event_id
        and (u.external_id = auth.uid() or u.role = 'admin')
    )
  );

-- RLS Policies: share_tokens
drop policy if exists "Users can manage share tokens for own events or admins all" on public.share_tokens;
create policy "Users can manage share tokens for own events or admins all"
  on public.share_tokens
  for all
  using (
    exists (
      select 1
      from public.events e
      join public.users u on u.id = e.created_by
      where e.id = public.share_tokens.event_id
        and (u.external_id = auth.uid() or u.role = 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.events e
      join public.users u on u.id = e.created_by
      where e.id = public.share_tokens.event_id
        and (u.external_id = auth.uid() or u.role = 'admin')
    )
  );
