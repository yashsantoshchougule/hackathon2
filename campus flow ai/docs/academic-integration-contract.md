# CampusFlow academic integration contract

## Current repository boundary

This branch contains a Vite client only. There is no FastAPI entry point, Supabase client, AuthContext, database migration, generated Supabase type file, or environment file in the supplied repository. The client therefore **does not** create a second Supabase client, make direct database calls, invent a user, or display seeded academic records.

`src/services/academicApi.ts` is the single authenticated browser boundary. The existing AuthContext must call `configureAcademicAuth(() => getAccessToken())` after it has verified the active Supabase session. Every request then has `Authorization: Bearer <access token>`. If no resolver/token is available, the client returns a typed `401 AUTHENTICATION_REQUIRED` state.

The default backend URL is same-origin `/api`; `VITE_ACADEMIC_API_URL` may point to the deployed FastAPI origin. It must never contain a service-role key.

## Required API surface

All dates are ISO 8601, all persisted instants are UTC, and every record includes `id`, `source_type`, `verification_status`, `created_at`, and `updated_at`.

| Endpoint | Student permission | Notes |
| --- | --- | --- |
| `GET /api/academics/dashboard-summary` | own summary | Return bounded lists, IDs and destination routes only. |
| `GET/POST /api/assignments` | own / personal create | Validate enrolled `subject_id`; official assignments are read-only. |
| `GET/PATCH/DELETE /api/assignments/{id}` | own, conditional write | Return 404 for inaccessible IDs. |
| `PATCH /api/assignments/{id}/status` | own personal status | Accept only `not_started`, `in_progress`, `completed`. |
| `GET/POST /api/timetable` | course view / personal create | Faculty records are read-only; conflict test is deterministic. |
| `GET/PATCH/DELETE /api/timetable/{id}` | conditional | Reject an end at or before start; validate recurrence. |
| `GET /api/timetable/conflicts` | own/course scope | Include class, exam and personal-event overlaps. |
| `GET/POST /api/examinations` | course view / role-gated publish | Student writes must return 403. |
| `GET/PATCH/DELETE /api/examinations/{id}` | conditional | Student access must not reveal another cohort’s record. |
| `GET /api/attendance` | own | Derive subject totals from raw records where available. |
| `GET /api/attendance/{subject_id}` | own | 404 on not-enrolled subject. |
| `POST /api/attendance/what-if` | own | Never persists the returned simulation. |
| `GET /api/attendance/risks` | own | Return typed safe/warning/critical/unknown risk. |
| `GET/POST /api/reminders` | own | AI suggestions remain `pending_confirmation`. |
| `GET/PATCH/DELETE /api/reminders/{id}` | own personal/linked | Source links must be ownership-checked. |
| `PATCH /api/reminders/{id}/complete` | own | Idempotently sets `completed`. |

Errors should use `{ "error": { "code", "message", "request_id" } }`, without database messages or secrets. Missing/invalid sessions return 401; unavailable roles return 403; inaccessible IDs should normally return 404.

## Required Supabase schema and RLS

No migrations were supplied, so the following is a compatibility requirement for the database branch rather than a new migration on this branch.

| Data area | Required fields / relationship | RLS and indexes | Consumers |
| --- | --- | --- | --- |
| `student_subjects` | `student_id`, `subject_id`, course/semester scope | Student may select own enrolment; index `(student_id, subject_id)` | assignments, timetable, attendance, AI context |
| `assignments` + `student_assignment_status` | source, verification, cohort/personal owner, due UTC, status timestamps | personal owner policy; cohort visibility by enrolment; indexes on owner/cohort + due date | dashboard, priority engine, planner |
| `timetable_entries` | subject/cohort, start/end UTC, original timezone, recurrence, source/verification | read only when enrolled/authorised; index scope + start; personal rows owner-only | timetable, planner, conflicts |
| `examinations` | subject/cohort, start/end, venue, syllabus ref, source/verification | enrolled-course read policy, faculty/HOD write policy; index cohort + start | exams, planner, notices |
| `attendance_records` | student, subject, date/session, status, source and verifier | student own-read; authorised faculty write; unique `(student_id, subject_id, session_id)` | attendance, risk engine, assistant |
| `reminders` | `user_id`, schedule UTC, timezone, lifecycle status, source entity | owner-only write/read; unique idempotency key for pending/scheduled duplicate detection | reminders, notifications, ATKT |
| `notifications` | user, severity, source entity, route, read timestamp | owner-only read/update; system insert constrained server-side | notifications UI |

RLS must be enabled for all Data API tables. Policies must check existing and new ownership on updates; students may not reassign ownership, publish official records, or change attendance/examination facts. The FastAPI layer must derive the user ID and secure role from the verified access token rather than a body value or editable metadata.

## Service methods for dashboard and AI

The backend academic service should expose authenticated, typed methods: `get_student_subjects`, `get_pending_assignments`, `get_assignments_in_range`, `get_upcoming_examinations`, `get_timetable_in_range`, `get_attendance_summary`, `get_attendance_risks`, `get_active_reminders`, and `get_available_study_slots`.

Each method receives the verified user ID internally, scopes every query, returns source IDs/timestamps/verification status, and omits internal fields. The dashboard calls the consolidated summary endpoint. The assistant, risk engine and planner consume this output; they can explain records but cannot change academic facts. Completed assignments are excluded from planner inputs. Timetable/exam intervals exclude occupied study slots.

## FastAPI integration prerequisites

When the backend branch is available, mount the above routers in `api.index:app`, inject the project’s existing verified Supabase-token dependency, and provide a repository over the existing Supabase schema. Do not add a new Supabase client or local persistence layer. Scheduled reminder delivery must use the project cron/notification infrastructure—not an in-process FastAPI loop.
