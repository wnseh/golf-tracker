-- rounds
create table rounds (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course      text not null,
  date        date not null,
  tee         text,
  handicap    numeric(4,1),
  rating      numeric(4,1),
  holes       int default 18,
  created_at  timestamptz default now()
);

alter table rounds enable row level security;
create policy "users can only access own rounds"
  on rounds for all using (auth.uid() = user_id);

-- holes
create table holes (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references rounds(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  hole_num    int not null,
  par         int not null,
  score       int,
  tee_routine jsonb,
  stg_shots   jsonb,
  putt_cards  jsonb,
  notes       text,
  saved_at    timestamptz default now(),
  unique(round_id, hole_num)
);

alter table holes enable row level security;
create policy "users can only access own holes"
  on holes for all using (auth.uid() = user_id);
