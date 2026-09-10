create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text check (char_length(description) <= 4000),
  scheduled_at timestamptz not null,
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) between 1 and 64),
  status text not null default 'pending_confirmation' check (status in ('pending_confirmation', 'scheduled', 'sent', 'completed', 'dismissed', 'cancelled', 'failed')),
  source_entity_type text check (char_length(source_entity_type) <= 80),
  source_entity_id uuid,
  created_by_type text not null default 'user' check (created_by_type in ('user', 'ai', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (created_by_type <> 'ai' or status = 'pending_confirmation')
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  type text not null check (char_length(type) between 1 and 80),
  title text not null check (char_length(title) between 1 and 240),
  message text not null check (char_length(message) <= 4000),
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'error')),
  source_entity_type text check (char_length(source_entity_type) <= 80),
  source_entity_id uuid,
  destination_route text check (destination_route is null or destination_route like '/%'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index reminders_user_scheduled_idx on public.reminders(user_id, scheduled_at);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);

create trigger reminders_set_updated_at before update on public.reminders for each row execute function authz.set_updated_at();

alter table public.reminders enable row level security;
alter table public.notifications enable row level security;

create policy "reminders belong to their owner" on public.reminders for select to authenticated using ((select auth.uid()) = user_id);
create policy "users create their reminders" on public.reminders for insert to authenticated with check (
  (select auth.uid()) = user_id and created_by_type = 'user'
);
create policy "users update their reminders" on public.reminders for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and created_by_type = 'user'
);
create policy "users remove their reminders" on public.reminders for delete to authenticated using ((select auth.uid()) = user_id);

create policy "notifications belong to their owner" on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy "users mark their notifications read" on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.reminders to authenticated;
grant select, update on public.notifications to authenticated;
revoke all on public.reminders, public.notifications from anon;
