alter table public.users
  add column if not exists moodle_user_id text;

create unique index if not exists idx_users_moodle_user_id_unique
  on public.users (moodle_user_id)
  where moodle_user_id is not null;
