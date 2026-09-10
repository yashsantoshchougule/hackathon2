create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) between 1 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system_event')),
  content text not null check (char_length(content) between 1 and 20000),
  citations jsonb not null default '[]',
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id) references public.chat_sessions(id, user_id) on delete cascade
);

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived', 'failed')),
  generation_reason text check (char_length(generation_reason) <= 1000),
  provider text check (char_length(provider) <= 80),
  model text check (char_length(model) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique (id, user_id)
);

create table public.study_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  source_entity_type text check (char_length(source_entity_type) <= 80),
  source_entity_id uuid,
  title text not null check (char_length(title) between 1 and 240),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'skipped', 'cancelled')),
  priority smallint not null default 3 check (priority between 1 and 5),
  reason text check (char_length(reason) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start),
  foreign key (plan_id, user_id) references public.study_plans(id, user_id) on delete cascade
);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  page_number integer check (page_number is null or page_number > 0),
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) between 1 and 20000),
  embedding jsonb,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index),
  foreign key (document_id, owner_user_id) references public.documents(id, owner_user_id) on delete cascade
);

create index chat_sessions_user_id_idx on public.chat_sessions(user_id);
create index chat_messages_session_created_idx on public.chat_messages(session_id, created_at);
create index study_plans_user_id_idx on public.study_plans(user_id);
create index study_plan_items_plan_id_idx on public.study_plan_items(plan_id);
create index document_chunks_owner_user_id_idx on public.document_chunks(owner_user_id);
create index document_chunks_document_id_idx on public.document_chunks(document_id);

create trigger chat_sessions_set_updated_at before update on public.chat_sessions for each row execute function authz.set_updated_at();
create trigger study_plans_set_updated_at before update on public.study_plans for each row execute function authz.set_updated_at();
create trigger study_plan_items_set_updated_at before update on public.study_plan_items for each row execute function authz.set_updated_at();

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_plan_items enable row level security;
alter table public.document_chunks enable row level security;

create policy "chat sessions belong to their owner" on public.chat_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "users create chat sessions" on public.chat_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update chat sessions" on public.chat_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users remove chat sessions" on public.chat_sessions for delete to authenticated using ((select auth.uid()) = user_id);

create policy "chat messages belong to their owner" on public.chat_messages for select to authenticated using ((select auth.uid()) = user_id);
create policy "users create their chat messages" on public.chat_messages for insert to authenticated with check (
  (select auth.uid()) = user_id and role = 'user' and exists (
    select 1 from public.chat_sessions cs where cs.id = chat_messages.session_id and cs.user_id = (select auth.uid())
  )
);

create policy "study plans belong to their owner" on public.study_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "study items belong to their owner" on public.study_plan_items for select to authenticated using (
  (select auth.uid()) = user_id and exists (select 1 from public.study_plans sp where sp.id = study_plan_items.plan_id and sp.user_id = (select auth.uid()))
);
create policy "document chunks belong to their owner" on public.document_chunks for select to authenticated using ((select auth.uid()) = owner_user_id);

grant select, insert, update, delete on public.chat_sessions to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant select on public.study_plans, public.study_plan_items, public.document_chunks to authenticated;
revoke all on public.chat_sessions, public.chat_messages, public.study_plans, public.study_plan_items, public.document_chunks from anon;
