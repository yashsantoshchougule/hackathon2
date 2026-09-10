create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  storage_bucket text not null check (storage_bucket in ('academic-documents', 'avatars')),
  storage_path text not null check (char_length(storage_path) between 1 and 512 and storage_path !~ '(^|/)\\.\\.(/|$)'),
  mime_type text not null check (mime_type in ('application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  checksum text check (checksum ~ '^[A-Fa-f0-9]{64}$'),
  document_type text not null default 'other' check (document_type in ('notes', 'syllabus', 'notice', 'assignment', 'textbook', 'atkt_document', 'other')),
  processing_status text not null default 'uploaded' check (processing_status in ('uploaded', 'processing', 'ready', 'failed')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  unique (id, owner_user_id),
  check (split_part(storage_path, '/', 1) = owner_user_id::text)
);

alter table public.examinations
  add constraint examinations_syllabus_document_id_fkey foreign key (syllabus_document_id) references public.documents(id) on delete set null;
alter table public.notices
  add constraint notices_document_id_fkey foreign key (document_id) references public.documents(id) on delete set null;

create index documents_owner_user_id_idx on public.documents(owner_user_id);
create index documents_subject_id_idx on public.documents(subject_id) where subject_id is not null;

create trigger documents_set_updated_at before update on public.documents for each row execute function authz.set_updated_at();

alter table public.documents enable row level security;

create policy "documents are visible to their owner" on public.documents for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "documents are created by their owner" on public.documents for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy "documents are edited by their owner" on public.documents for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy "documents are removed by their owner" on public.documents for delete to authenticated using ((select auth.uid()) = owner_user_id);

grant select, insert, update, delete on public.documents to authenticated;
revoke all on public.documents from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('academic-documents', 'academic-documents', false, 10485760, array['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "users read their academic objects" on storage.objects for select to authenticated using (
  bucket_id = 'academic-documents' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "users upload their academic objects" on storage.objects for insert to authenticated with check (
  bucket_id = 'academic-documents' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "users replace their academic objects" on storage.objects for update to authenticated using (
  bucket_id = 'academic-documents' and (storage.foldername(name))[1] = (select auth.uid()::text)
) with check (
  bucket_id = 'academic-documents' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "users delete their academic objects" on storage.objects for delete to authenticated using (
  bucket_id = 'academic-documents' and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "users read their avatars" on storage.objects for select to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "users upload their avatars" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "users replace their avatars" on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text)
) with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "users delete their avatars" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
