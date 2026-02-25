create table user_clubs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_name text not null,
  carry_m numeric(5,1) not null default 0,
  total_m numeric(5,1) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique(user_id, club_name)
);

alter table user_clubs enable row level security;

create policy "users own clubs"
  on user_clubs for all
  using (auth.uid() = user_id);

create index idx_user_clubs_user on user_clubs(user_id);
