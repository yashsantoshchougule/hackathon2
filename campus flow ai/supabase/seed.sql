-- Development-only fictional catalogue. No users or privileged accounts are seeded.
insert into public.courses (code, name, department, duration_semesters)
values ('BTECH-CSE', 'B.Tech Computer Science', 'Computer Science', 8)
on conflict (code) do nothing;

insert into public.semesters (course_id, semester_number, name)
select id, 1, 'Semester 1' from public.courses where code = 'BTECH-CSE'
on conflict (course_id, semester_number) do nothing;

insert into public.subjects (course_id, semester_id, code, name, minimum_attendance_percentage)
select c.id, s.id, subject.code, subject.name, 75
from public.courses c
join public.semesters s on s.course_id = c.id and s.semester_number = 1
cross join (values ('CS101', 'Programming Fundamentals'), ('MA101', 'Discrete Mathematics'), ('HS101', 'Communication Skills')) as subject(code, name)
where c.code = 'BTECH-CSE'
on conflict (semester_id, code) do nothing;
