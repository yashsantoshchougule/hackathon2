-- Run after `supabase db reset` against a disposable local project.
-- Substitute two real auth.users UUIDs. These checks must return zero rows.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select count(*) as must_be_zero from public.profiles where id = '00000000-0000-0000-0000-000000000002';
select count(*) as must_be_zero from public.assignments where created_by = '00000000-0000-0000-0000-000000000002' and visibility = 'personal';
select count(*) as must_be_zero from public.attendance_records where user_id = '00000000-0000-0000-0000-000000000002';
select count(*) as must_be_zero from public.reminders where user_id = '00000000-0000-0000-0000-000000000002';
select count(*) as must_be_zero from public.documents where owner_user_id = '00000000-0000-0000-0000-000000000002';
select count(*) as must_be_zero from public.chat_sessions where user_id = '00000000-0000-0000-0000-000000000002';
rollback;
