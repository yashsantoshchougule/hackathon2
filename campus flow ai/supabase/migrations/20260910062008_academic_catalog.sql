create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,32}$'),
  name text not null check (char_length(name) between 2 and 160),
  department text not null check (char_length(department) between 2 and 120),
  duration_semesters smallint not null check (duration_semesters between 1 and 20),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  semester_number smallint not null check (semester_number between 1 and 20),
  name text not null check (char_length(name) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, semester_number),
  unique (id, course_id)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  semester_id uuid not null,
  code text not null check (code ~ '^[A-Z0-9_-]{2,32}$'),
  name text not null check (char_length(name) between 2 and 160),
  minimum_attendance_percentage numeric(5,2) not null default 75 check (minimum_attendance_percentage between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (semester_id, course_id) references public.semesters(id, course_id) on delete restrict,
  unique (semester_id, code)
);

alter table public.profiles
  add constraint profiles_course_id_fkey foreign key (course_id) references public.courses(id) on delete restrict,
  add constraint profiles_semester_course_fkey foreign key (semester_id, course_id) references public.semesters(id, course_id) on delete restrict;

create table public.student_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  academic_year smallint not null check (academic_year between 2000 and 2100),
  enrolment_status text not null default 'active' check (enrolment_status in ('active', 'dropped', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, subject_id, academic_year)
);

create table public.staff_subject_assignments (
  user_id uuid not null references public.profiles(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, subject_id)
);

create table public.hod_department_assignments (
  user_id uuid not null references public.profiles(id) on delete restrict,
  department text not null check (char_length(department) between 2 and 120),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, department)
);

create index semesters_course_id_idx on public.semesters(course_id);
create index subjects_course_semester_idx on public.subjects(course_id, semester_id);
create index student_subjects_user_id_idx on public.student_subjects(user_id);
create index student_subjects_subject_id_idx on public.student_subjects(subject_id);
create index staff_subject_assignments_subject_id_idx on public.staff_subject_assignments(subject_id);

create trigger courses_set_updated_at before update on public.courses
  for each row execute function authz.set_updated_at();
create trigger semesters_set_updated_at before update on public.semesters
  for each row execute function authz.set_updated_at();
create trigger subjects_set_updated_at before update on public.subjects
  for each row execute function authz.set_updated_at();
create trigger student_subjects_set_updated_at before update on public.student_subjects
  for each row execute function authz.set_updated_at();

create function authz.validate_profile_onboarding()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.onboarding_completed and (
    new.course_id is distinct from old.course_id
    or new.semester_id is distinct from old.semester_id
    or new.academic_year is distinct from old.academic_year
  ) then
    raise exception 'academic placement cannot be changed after onboarding';
  end if;

  if new.onboarding_completed and not old.onboarding_completed and (
    char_length(trim(new.full_name)) < 2
    or new.college_name is null
    or char_length(trim(new.college_name)) < 2
    or new.course_id is null
    or new.semester_id is null
    or new.academic_year is null
    or not exists (
      select 1 from public.student_subjects
      where user_id = new.id and enrolment_status = 'active'
    )
  ) then
    raise exception 'complete academic profile and subject enrolment before onboarding';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_onboarding
  before update on public.profiles
  for each row execute function authz.validate_profile_onboarding();

alter table public.courses enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.student_subjects enable row level security;
alter table public.staff_subject_assignments enable row level security;
alter table public.hod_department_assignments enable row level security;

create policy "active courses are readable"
  on public.courses for select to authenticated using (active);
create policy "active semesters are readable"
  on public.semesters for select to authenticated using (active);
create policy "active subjects are readable"
  on public.subjects for select to authenticated using (active);

create policy "students read their enrolments"
  on public.student_subjects for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "students create their enrolments"
  on public.student_subjects for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'student')
    and exists (
      select 1 from public.subjects s join public.profiles p on p.id = (select auth.uid())
      where s.id = student_subjects.subject_id and s.active and s.course_id = p.course_id and s.semester_id = p.semester_id
    )
  );
create policy "students edit their enrolments"
  on public.student_subjects for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.subjects s join public.profiles p on p.id = (select auth.uid())
      where s.id = student_subjects.subject_id and s.active and s.course_id = p.course_id and s.semester_id = p.semester_id
    )
  );
create policy "students remove their enrolments"
  on public.student_subjects for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "staff read subject enrolments"
  on public.student_subjects for select to authenticated
  using (exists (
    select 1 from public.staff_subject_assignments
    where user_id = (select auth.uid()) and subject_id = student_subjects.subject_id
  ));

create policy "staff read their subject assignments"
  on public.staff_subject_assignments for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "hods read their department assignments"
  on public.hod_department_assignments for select to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.courses, public.semesters, public.subjects to authenticated;
grant select, insert, update, delete on public.student_subjects to authenticated;
grant select on public.staff_subject_assignments, public.hod_department_assignments to authenticated;
revoke all on public.courses, public.semesters, public.subjects, public.student_subjects,
  public.staff_subject_assignments, public.hod_department_assignments from anon;
