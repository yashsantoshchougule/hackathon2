create extension if not exists pgcrypto;

create schema if not exists authz;
revoke all on schema authz from public;

create type public.app_role as enum ('student', 'faculty', 'hod', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  avatar_path text check (char_length(avatar_path) <= 512),
  college_name text check (char_length(college_name) <= 160),
  course_id uuid,
  semester_id uuid,
  academic_year smallint check (academic_year between 2000 and 2100),
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) between 1 and 64),
  minimum_attendance_percentage numeric(5,2) not null default 75 check (minimum_attendance_percentage between 0 and 100),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_start_time time,
  preferred_end_time time,
  average_session_minutes smallint not null default 45 check (average_session_minutes between 15 and 240),
  break_minutes smallint not null default 10 check (break_minutes between 0 and 60),
  preferred_days smallint[] not null default '{}'
    check (cardinality(preferred_days) <= 7 and preferred_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (preferred_start_time is null or preferred_end_time is null or preferred_start_time <> preferred_end_time)
);

create table public.privileged_action_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (char_length(action) between 1 and 120),
  target_entity_type text not null check (char_length(target_entity_type) between 1 and 80),
  target_entity_id uuid,
  request_id uuid,
  created_at timestamptz not null default now()
);

create index profiles_course_id_idx on public.profiles(course_id);
create index profiles_semester_id_idx on public.profiles(semester_id);

create function authz.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function authz.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, authz
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function authz.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function authz.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function authz.set_updated_at();
create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function authz.set_updated_at();
create trigger study_preferences_set_updated_at
  before update on public.study_preferences
  for each row execute function authz.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.study_preferences enable row level security;
alter table public.privileged_action_audit enable row level security;

create policy "profiles are visible to their owner"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles are editable by their owner"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "roles are visible to their owner"
  on public.user_roles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "preferences are visible to their owner"
  on public.study_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "preferences are created by their owner"
  on public.study_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "preferences are editable by their owner"
  on public.study_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "preferences are removable by their owner"
  on public.study_preferences for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.study_preferences to authenticated;
revoke all on public.profiles, public.user_roles, public.study_preferences from anon;
revoke all on public.privileged_action_audit from anon, authenticated;
