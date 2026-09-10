# CampusFlow AI integration contract

Last reviewed: 2026-09-10

## Current repository state

This branch began with a standalone Vite starter. It did not contain the shared CampusFlow shell,
React routes, AuthContext, Supabase client, FastAPI app, database migrations, generated database
types, or academic services. No database migration is created here. The AI layer therefore uses the
contracts below and reports unavailable/partial-data states until the owning branches provide them.

The only public AI endpoint is `GET /api/health`. Every feature endpoint depends on
`require_student` (which wraps `get_current_user`), validates the bearer token through
`GET {SUPABASE_URL}/auth/v1/user`, derives
the user ID from that verified response, and forwards the user token to Data API and Storage calls.
This preserves Row-Level Security. Neither request bodies nor editable user metadata are accepted as
identity or authorization evidence. The role is read only from verified `app_metadata.role`.
Supabase anonymous users are rejected; the AI layer never substitutes a demonstration identity.

This follows the current Supabase guidance to use a verified user/claims operation for authorization,
to send the project key in the `apikey` header, and to combine grants with RLS:

- <https://supabase.com/docs/reference/python/auth-getuser>
- <https://supabase.com/docs/guides/auth/server-side/creating-a-client>
- <https://supabase.com/docs/guides/getting-started/api-keys>
- <https://supabase.com/docs/guides/api/securing-your-api>
- <https://supabase.com/docs/guides/database/postgres/row-level-security>
- <https://supabase.com/docs/reference/javascript/auth-signout>
- <https://supabase.com/changelog/29289-supabase-auth-asymmetric-keys-support-in-2025>

## Required database objects

Field names below are the interface consumed by this branch. The database owner should reconcile
them with the canonical schema and update `AcademicContextService` mappings if names differ.

| Table | Required fields and relationship | Ownership and index | Expected RLS | Consumers |
|---|---|---|---|---|
| `profiles` | `id -> auth.users.id`, `course`, `semester`, `timezone`, `updated_at` | PK/index `id` | A student selects only `id = auth.uid()`; staff uses the existing role policy | Context, planner |
| `student_subjects` | `id`, `student_id`, `subject_id -> subjects.id`, optional `difficulty`, `is_weak`, `updated_at` | index `(student_id, subject_id)` | Student rows only | Context, planner |
| `assignments` | `id`, `student_id`, `subject_id`, `title`, `description`, `due_at`, `status`/`completed`, `estimated_minutes`, `updated_at` | index `(student_id, due_at)` | Student rows only; faculty permissions remain owned by academic branch | Assistant, priority, planner, dashboard |
| `examinations` | `id`, `student_id` or a student-safe enrollment view, `subject_id`, `title`, `starts_at`, `ends_at`, `location`, `updated_at` | index `(student_id, starts_at)` or equivalent join indexes | Only examinations applicable to authenticated student's enrollment | Assistant, planner |
| `timetable_entries` | `id`, `student_id` or student-safe enrollment view, `subject_id`, `title`, `starts_at`, `ends_at`, `day_of_week`, `updated_at` | index `(student_id, starts_at)` | Only student's timetable | Context, conflict engine |
| `attendance_summaries` | output of the academic attendance service: `id`, `student_id`, `subject_id`, `attended_classes`, `total_classes`, `percentage`, `minimum_percentage`, `classes_required`, `updated_at` | unique/index `(student_id, subject_id)` | Student selects own validated summaries | Assistant, priority, dashboard. AI never calculates these values |
| `notices` | `id`, `student_id`, `document_id`, `title`, `status`, optional publication/deadline fields, timestamps | index `(student_id, status)` | Student sees own extraction-linked notices; campus notices may use a separate safe view | Notice review, context |
| `study_preferences` | `id`, `student_id`, `timezone`, `preferred_study_start/end`, `average_session_minutes`, `break_minutes`, `daily_available_minutes`, `updated_at` | unique `student_id` | Student row only | Planner |
| `study_plans` | `id`, `student_id`, `status`, `date_from/to`, `explanation`, `recovery_mode`, `warnings jsonb`, `created_at`, `reviewed_at` | index `(student_id, created_at desc)` | Student CRUD on own plans; status transitions should also be constrained | Planner, dashboard |
| `study_plan_items` | `id`, `plan_id -> study_plans.id`, `student_id`, source fields, title, times, priority, reason, completed | index `(student_id, plan_id, starts_at)` | Student rows only; enforce parent ownership | Planner, recovery mode |
| `chat_sessions` | `id`, `student_id`, `created_at` | index `(student_id, created_at desc)` | Student sessions only | Assistant history |
| `chat_messages` | `id`, `conversation_id`, `student_id`, `role`, `content`, `citations jsonb`, provider/model, `source_ids`, `created_at` | index `(student_id, conversation_id, created_at)` | Student messages only; enforce parent ownership | Assistant history and generation audit |
| `documents` | `id`, `student_id`, `subject_id`, title, bucket/path, MIME type, `file_hash`, processing status, timestamps | unique `(student_id, file_hash)`; index `(student_id, subject_id)` | Student rows only | Notice upload, copilot |
| `document_chunks` | `id`, `document_id`, `student_id`, `subject_id`, `page_number`, `content`, timestamps; optional embedding if pgvector exists | index `(student_id, document_id)` | Student chunks only; enforce parent ownership | Copilot retrieval |
| `notice_extractions` | `id`, `student_id`, `notice_id`, `document_id`, `file_hash`, `status`, `extracted_data jsonb`, provider/model, `source_ids`, timestamps | unique `(student_id, file_hash)`; index `(student_id, notice_id)` | Student rows only | Notice workflow |
| `reminders` | `id`, `student_id`, title, `remind_at`, source type/entity ID, status, timestamps | unique `(student_id, source_type, source_entity_id)` | Student rows only | Confirmed notices, planner context |
| `ai_generations` | `id` default, `student_id`, `feature`, provider/model, `validated_result jsonb`, `source_ids`, `confirmation_status`, `created_at` | index `(student_id, feature, created_at desc)` | Student rows only; writes originate from authenticated API requests | Auditing validated copilot and future AI output |

The current Data API adapter always adds `student_id=eq.<verified-id>` (or `id` for profiles) even
though RLS must also enforce ownership. It uses a publishable/anon key, never a secret/service-role
key. If an owning branch requires server-side elevated access, that must be implemented as a
separately reviewed adapter with explicit user filters; do not replace the current RLS path casually.

## Storage contract

Private buckets `notices` and `resources` are required. Object paths start with the verified user ID:
`{auth.uid()}/{sha256}/{sanitized_filename}`. Storage policies must allow an authenticated user to
insert/select only objects whose first folder equals `auth.uid()`. Do not make either bucket public.
Existing resource pages should generate short-lived signed URLs after ownership checks.

Notice and resource uploads accept PDF and UTF-8 text, default maximum 10 MiB, detect content hashes,
reject unreadable/empty/password-protected files, retain page numbers, and remove repeated page lines.
For stronger malware controls, add the platform's approved file-scanning service before production.

## Authentication and shared UI integration

`src/context/AuthContext.tsx` and `src/lib/supabase.ts` are minimal compatibility implementations
because the auth branch was absent. When integrating the canonical auth branch:

1. Keep `getAccessToken(): Promise<string | null>` or adapt `useAiClient` to the canonical session API.
2. Keep automatic token refresh in the canonical Supabase client.
3. Replace only the neutral `AiShell` wrapper with the shared `AppShell`; retain page bodies.
4. Mount `/assistant`, `/planner`, `/notices`, `/notices/:noticeId`, and `/study-copilot` in the shared router.
5. Replace integration-pending routes with the real assignments, attendance, timetable, examinations,
   and resources pages. Record IDs and destination paths are already typed.
6. Route the `campusflow:session-expired` event to the existing login/session-expiry flow.

## Academic-module interfaces

- Attendance must publish already validated `percentage`, `minimum_percentage`, and
  `classes_required`. The AI layer only formats explanations and links to `/attendance`.
- Assignments must expose completion and verified deadlines; completing an assignment should
  invalidate/refetch dashboard priorities and the current plan.
- Timetable and examination services must return timezone-aware UTC `starts_at`/`ends_at` values.
- The dashboard can consume `DashboardSummary` from `src/types/ai.ts` and
  `GET /api/dashboard/ai-summary` without rendering raw provider output.
- Notifications should map priority results to `{notification_type, source_entity_id, message,
  severity, destination_route}`. This branch does not mutate the shared notification UI.
- ATKT features remain disabled. Future services may explain database/document-verified rules but
  must never decide eligibility, select subjects, change payment state, or replace approval.

## Provider and structured output

The provider is injected through `AIProvider`. Gemini model names are never hardcoded: primary and
fallback models come from environment configuration. Fallbacks and retries occur only for network,
timeout, HTTP 408/429, and 5xx failures. Invalid keys, blocked requests, and malformed client input
are not retried. Structured notice output is Pydantic-validated and retried once when malformed;
unvalidated output is never persisted.

Prompts keep system instructions, verified data/evidence, and student requests in explicit sections.
Documents are untrusted evidence and cannot select tools, run SQL, or override the system message.
No model receives database credentials or provider keys.

## Environment variables

Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy
`VITE_SUPABASE_ANON_KEY` is accepted), `VITE_AI_API_URL`.

Backend: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (legacy `SUPABASE_ANON_KEY` is accepted),
`AI_PROVIDER`, `AI_MODEL_PRIMARY`, `AI_MODEL_FALLBACKS`, `AI_REQUEST_TIMEOUT_SECONDS`,
`AI_MAX_RETRIES`, `GEMINI_API_KEY`, `ALLOWED_ORIGINS`, `MAX_UPLOAD_BYTES`,
`NOTICE_STORAGE_BUCKET`, `RESOURCE_STORAGE_BUCKET`.

Provider keys and elevated Supabase keys must never use a `VITE_` prefix.

## API surface

- `GET /api/health` (public)
- `POST /api/assistant/chat`
- `POST /api/planner/generate`
- `GET /api/planner/current`
- `POST /api/planner/{plan_id}/confirm`
- `POST /api/planner/{plan_id}/reject`
- `POST /api/notices/extract`
- `GET /api/notices/{notice_id}`
- `POST /api/notices/{notice_id}/confirm`
- `POST /api/notices/{notice_id}/reject`
- `GET /api/documents`
- `POST /api/documents/process`
- `POST /api/copilot/query`
- `GET /api/dashboard/ai-summary`
