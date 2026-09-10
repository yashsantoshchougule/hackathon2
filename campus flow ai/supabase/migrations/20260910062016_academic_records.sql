create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 240),
  description text,
  subject_id uuid references public.subjects(id) on delete restrict,
  course_id uuid references public.courses(id) on delete restrict,
  semester_id uuid references public.semesters(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  visibility text not null check (visibility in ('personal', 'subject', 'semester', 'course')),
  source_type text not null check (source_type in ('student', 'faculty', 'notice_extraction', 'system_import')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  estimated_minutes integer check (estimated_minutes between 1 and 1440),
  attachment_path text check (char_length(attachment_path) <= 512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_at is null or due_at > assigned_at),
  check ((visibility = 'personal' and source_type = 'student' and subject_id is null) or (visibility <> 'personal' and subject_id is not null))
);

create table public.student_assignment_status (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  personal_priority smallint check (personal_priority between 1 and 5),
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id),
  check ((status = 'completed') = (completed_at is not null))
);

create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete restrict,
  course_id uuid references public.courses(id) on delete restrict,
  semester_id uuid references public.semesters(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  entry_type text not null check (entry_type in ('lecture', 'practical', 'tutorial', 'exam', 'event', 'personal')),
  day_of_week smallint check (day_of_week between 0 and 6),
  specific_date date,
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) between 1 and 64),
  location text check (char_length(location) <= 240),
  recurrence_rule text check (char_length(recurrence_rule) <= 240),
  effective_from date,
  effective_until date,
  source_type text not null default 'faculty' check (source_type in ('student', 'faculty', 'notice_extraction', 'system_import')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (specific_date is not null or day_of_week is not null),
  check (effective_until is null or effective_from is null or effective_until >= effective_from),
  check ((entry_type = 'personal' and owner_user_id is not null and source_type = 'student') or (entry_type <> 'personal' and subject_id is not null))
);

create table public.examinations (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  semester_id uuid not null references public.semesters(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 240),
  exam_type text not null check (exam_type in ('internal', 'practical', 'midterm', 'end_semester', 'supplementary', 'other')),
  exam_date date not null,
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) between 1 and 64),
  venue text check (char_length(venue) <= 240),
  syllabus_document_id uuid,
  maximum_marks numeric(7,2) check (maximum_marks > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  source_type text not null default 'faculty' check (source_type in ('faculty', 'notice_extraction', 'system_import')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  class_date date not null,
  class_start_time time,
  status text not null check (status in ('present', 'absent', 'excused', 'cancelled', 'not_marked')),
  source_type text not null default 'faculty' check (source_type in ('faculty', 'system_import', 'notice_extraction')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, subject_id, class_date, class_start_time)
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 240),
  description text,
  issuing_department text check (char_length(issuing_department) <= 120),
  published_at timestamptz not null default now(),
  deadline_at timestamptz,
  course_id uuid references public.courses(id) on delete restrict,
  semester_id uuid references public.semesters(id) on delete restrict,
  document_id uuid,
  source_type text not null check (source_type in ('faculty', 'notice_extraction', 'system_import')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deadline_at is null or deadline_at >= published_at)
);

create table public.notice_extractions (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  extracted_data jsonb not null default '{}',
  confidence_data jsonb not null default '{}',
  status text not null default 'processing' check (status in ('processing', 'pending_confirmation', 'confirmed', 'rejected', 'failed')),
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  provider text check (char_length(provider) <= 80),
  model text check (char_length(model) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'confirmed') = (confirmed_at is not null))
);

create index assignments_subject_id_idx on public.assignments(subject_id);
create index assignments_created_by_idx on public.assignments(created_by);
create index assignments_due_at_idx on public.assignments(due_at) where due_at is not null;
create index student_assignment_status_user_id_idx on public.student_assignment_status(user_id);
create index timetable_entries_subject_id_idx on public.timetable_entries(subject_id);
create index timetable_entries_owner_user_id_idx on public.timetable_entries(owner_user_id) where owner_user_id is not null;
create index examinations_subject_date_idx on public.examinations(subject_id, exam_date);
create index attendance_records_user_subject_idx on public.attendance_records(user_id, subject_id, class_date);
create index notices_course_semester_idx on public.notices(course_id, semester_id);
create index notice_extractions_user_id_idx on public.notice_extractions(user_id);

create trigger assignments_set_updated_at before update on public.assignments for each row execute function authz.set_updated_at();
create trigger student_assignment_status_set_updated_at before update on public.student_assignment_status for each row execute function authz.set_updated_at();
create trigger timetable_entries_set_updated_at before update on public.timetable_entries for each row execute function authz.set_updated_at();
create trigger examinations_set_updated_at before update on public.examinations for each row execute function authz.set_updated_at();
create trigger attendance_records_set_updated_at before update on public.attendance_records for each row execute function authz.set_updated_at();
create trigger notices_set_updated_at before update on public.notices for each row execute function authz.set_updated_at();
create trigger notice_extractions_set_updated_at before update on public.notice_extractions for each row execute function authz.set_updated_at();

alter table public.assignments enable row level security;
alter table public.student_assignment_status enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.examinations enable row level security;
alter table public.attendance_records enable row level security;
alter table public.notices enable row level security;
alter table public.notice_extractions enable row level security;

create policy "students read relevant assignments" on public.assignments for select to authenticated using (
  created_by = (select auth.uid())
  or exists (select 1 from public.student_subjects ss where ss.user_id = (select auth.uid()) and ss.subject_id = assignments.subject_id and ss.enrolment_status = 'active')
  or exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = assignments.subject_id)
);
create policy "students create personal assignments" on public.assignments for insert to authenticated with check (
  created_by = (select auth.uid()) and visibility = 'personal' and source_type = 'student'
);
create policy "students edit personal assignments" on public.assignments for update to authenticated using (
  created_by = (select auth.uid()) and visibility = 'personal'
) with check (created_by = (select auth.uid()) and visibility = 'personal' and source_type = 'student');
create policy "staff create subject assignments" on public.assignments for insert to authenticated with check (
  visibility <> 'personal' and exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = assignments.subject_id)
);
create policy "staff edit their subject assignments" on public.assignments for update to authenticated using (
  created_by = (select auth.uid()) and exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = assignments.subject_id)
) with check (
  created_by = (select auth.uid()) and exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = assignments.subject_id)
);

create policy "assignment status belongs to its student" on public.student_assignment_status for select to authenticated using ((select auth.uid()) = user_id);
create policy "students create assignment status" on public.student_assignment_status for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "students edit assignment status" on public.student_assignment_status for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "students remove assignment status" on public.student_assignment_status for delete to authenticated using ((select auth.uid()) = user_id);

create policy "students read relevant timetable entries" on public.timetable_entries for select to authenticated using (
  owner_user_id = (select auth.uid())
  or exists (select 1 from public.student_subjects ss where ss.user_id = (select auth.uid()) and ss.subject_id = timetable_entries.subject_id and ss.enrolment_status = 'active')
  or exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = timetable_entries.subject_id)
);
create policy "students create personal timetable entries" on public.timetable_entries for insert to authenticated with check (
  owner_user_id = (select auth.uid()) and created_by = (select auth.uid()) and entry_type = 'personal' and source_type = 'student'
);
create policy "students edit personal timetable entries" on public.timetable_entries for update to authenticated using (owner_user_id = (select auth.uid())) with check (
  owner_user_id = (select auth.uid()) and created_by = (select auth.uid()) and entry_type = 'personal' and source_type = 'student'
);
create policy "students remove personal timetable entries" on public.timetable_entries for delete to authenticated using (owner_user_id = (select auth.uid()));
create policy "staff manage their subject timetable entries" on public.timetable_entries for all to authenticated using (
  exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = timetable_entries.subject_id)
) with check (
  created_by = (select auth.uid()) and exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = timetable_entries.subject_id)
);

create policy "students read their examination schedule" on public.examinations for select to authenticated using (
  exists (select 1 from public.student_subjects ss where ss.user_id = (select auth.uid()) and ss.subject_id = examinations.subject_id and ss.enrolment_status = 'active')
  or exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = examinations.subject_id)
);
create policy "staff manage their subject examinations" on public.examinations for all to authenticated using (
  created_by = (select auth.uid()) and exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = examinations.subject_id)
) with check (
  created_by = (select auth.uid()) and exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = examinations.subject_id)
);

create policy "students read their attendance" on public.attendance_records for select to authenticated using ((select auth.uid()) = user_id);
create policy "staff read subject attendance" on public.attendance_records for select to authenticated using (
  exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = attendance_records.subject_id)
);
create policy "staff create subject attendance" on public.attendance_records for insert to authenticated with check (
  recorded_by = (select auth.uid()) and exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = attendance_records.subject_id)
);
create policy "staff update subject attendance" on public.attendance_records for update to authenticated using (
  recorded_by = (select auth.uid()) and exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = attendance_records.subject_id)
) with check (
  recorded_by = (select auth.uid()) and exists (select 1 from public.staff_subject_assignments sa where sa.user_id = (select auth.uid()) and sa.subject_id = attendance_records.subject_id)
);

create policy "students read applicable notices" on public.notices for select to authenticated using (
  course_id is null or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.course_id = notices.course_id and (notices.semester_id is null or p.semester_id = notices.semester_id))
);
create policy "staff create notices for their courses" on public.notices for insert to authenticated with check (
  created_by = (select auth.uid()) and exists (
    select 1 from public.staff_subject_assignments sa join public.subjects s on s.id = sa.subject_id
    where sa.user_id = (select auth.uid()) and s.course_id = notices.course_id
  )
);
create policy "staff edit their notices" on public.notices for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

create policy "students read their notice extractions" on public.notice_extractions for select to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.assignments, public.student_assignment_status, public.timetable_entries,
  public.examinations, public.attendance_records, public.notices, public.notice_extractions to authenticated;
revoke all on public.assignments, public.student_assignment_status, public.timetable_entries, public.examinations,
  public.attendance_records, public.notices, public.notice_extractions from anon;
