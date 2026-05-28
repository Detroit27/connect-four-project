-- ============================================================
-- CONNECT FOUR — SUPABASE SETUP
-- Запусти весь этот файл в Supabase → SQL Editor → Run
-- ============================================================

-- 1. PROFILES (привязан к auth.users)
create table if not exists profiles (
  id            uuid references auth.users primary key,
  username      text unique not null,
  currency      integer default 0,
  inventory     text[] default array['classic'],
  current_skin  text default 'classic',
  mp_wins       integer default 0,
  created_at    timestamptz default now()
);

-- 2. SINGLEPLAYER MATCHES
create table if not exists sp_matches (
  id               uuid default gen_random_uuid() primary key,
  player_id        uuid references profiles(id) on delete cascade,
  difficulty       text not null,
  result           text not null,
  moves            jsonb not null default '[]',
  moves_count      integer,
  duration_seconds integer,
  coins_earned     integer default 0,
  played_at        timestamptz default now()
);

-- 3. MULTIPLAYER ROOMS
create table if not exists mp_rooms (
  id              uuid default gen_random_uuid() primary key,
  code            text unique not null,
  host_id         uuid references profiles(id),
  guest_id        uuid references profiles(id),
  host_username   text not null,
  guest_username  text,
  board           jsonb not null,
  moves           jsonb default '[]',
  current_player  integer default 1,
  status          text default 'waiting',
  winner          integer,
  created_at      timestamptz default now()
);

-- 4. MULTIPLAYER MATCH HISTORY
create table if not exists mp_matches (
  id                 uuid default gen_random_uuid() primary key,
  player_id          uuid references profiles(id) on delete cascade,
  opponent_id        uuid,
  room_code          text,
  opponent_username  text,
  result             text not null,
  moves              jsonb not null default '[]',
  played_at          timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles   enable row level security;
alter table sp_matches enable row level security;
alter table mp_rooms   enable row level security;
alter table mp_matches enable row level security;

-- Profiles: все могут читать (для лидерборда), редактировать только свой
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- SP matches: только своё
create policy "sp_matches_select" on sp_matches for select using (auth.uid() = player_id);
create policy "sp_matches_insert" on sp_matches for insert with check (auth.uid() = player_id);

-- Rooms: читать могут все (чтобы зайти по коду), писать — участники
create policy "mp_rooms_select" on mp_rooms for select using (true);
create policy "mp_rooms_insert" on mp_rooms for insert with check (auth.uid() = host_id);
-- Allow host & guest to update, AND allow any authenticated user to join a waiting room
-- (needed because guest_id is NULL before the guest joins, so "= guest_id" would not match)
create policy "mp_rooms_update" on mp_rooms for update using (
  auth.uid() = host_id
  or auth.uid() = guest_id
  or (status = 'waiting' and guest_id is null)
);

-- MP matches: только своё
create policy "mp_matches_select" on mp_matches for select using (auth.uid() = player_id);
create policy "mp_matches_insert" on mp_matches for insert with check (auth.uid() = player_id);

-- ============================================================
-- TRIGGER: создать профиль при регистрации
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- REALTIME для mp_rooms
-- ============================================================
alter publication supabase_realtime add table mp_rooms;
