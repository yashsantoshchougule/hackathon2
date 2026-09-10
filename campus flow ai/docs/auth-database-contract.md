# CampusFlow auth and database contract

## Identity and API

The React app owns one browser client: `src/lib/supabase.ts`. Feature clients call `authenticatedFetch()` from `src/services/apiClient.ts`; it supplies `Authorization: Bearer <access-token>`, retries once after the supported Supabase refresh flow, and clears an invalid local session on a final `401`.

FastAPI endpoints depend on `get_current_user` from `api.dependencies.auth`. It verifies the access token with Supabase `get_claims`, then reads the canonical `public.user_roles.role`. Never accept a `user_id`, role, or access token from a request body. User-scoped queries must use `get_user_client(token)` so RLS applies. The cached service client is for narrowly privileged backend work only; record every Admin/HOD action with `record_privileged_action`.

`CampusFlowUser` is exported from `src/types/auth.ts`. Dashboard code should consume `useAuth()` and use `profile.fullName`, `profile.courseId`, `profile.semesterId`, `profile.timezone`, and `profile.onboardingCompleted`; it must not hard-code academic context.

## Ownership and roles

`profiles.id`, `user_roles.user_id`, and all student ownership fields point to `auth.users.id`. The private `authz.handle_new_user` trigger creates a blank profile and the only public-signup role: `student`. The trigger has a fixed search path and no public execution grant. `user_roles` only has an owner-read policy—there is no client insert or update policy.

Allowed app roles are `student`, `faculty`, `hod`, and `admin`. Faculty access is scoped by `staff_subject_assignments(user_id, subject_id)` and HOD scope is represented by `hod_department_assignments(user_id, department)`. Populate either only through an authorized, audited backend operation. Direct Data API admin override is intentionally absent.

## Academic tables

| Area | Tables |
| --- | --- |
| Catalog | `courses`, `semesters`, `subjects`, `student_subjects` |
| Work | `assignments`, `student_assignment_status`, `timetable_entries`, `examinations`, `attendance_records` |
| Notices | `notices`, `notice_extractions` |
| Reminders | `reminders`, `notifications` |
| Files | `documents`, `document_chunks` |
| AI | `chat_sessions`, `chat_messages`, `study_plans`, `study_plan_items` |

Academic services receive the verified user from the dependency, then derive course and semester from `profiles`, and active subject IDs from `student_subjects`. `attendance_records` is the source of truth; attendance percentages are derived. Official exams and attendance have no student write policy. AI services must use the verified identity to query only that owner’s sessions, plans, documents, and chunks. Do not put access tokens, credentials, or hidden prompts into AI prompts or chat rows.

## Storage

`academic-documents` and `avatars` are private buckets. Academic uploads use `{auth.uid}/{document-id}/{safe-filename}` and avatar uploads use `{auth.uid}/avatar-{uuid}.{extension}`. Object policies require the first folder to match `auth.uid()` for select/insert/update/delete. `documents` stores metadata, never grants access by raw path, and `getDocumentPreview()` creates a 300-second signed URL. Validate MIME type, filename, and size before upload; delete through an authorized workflow that keeps the object and metadata consistent.

## Environment and deployment

Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and optional `VITE_SUPABASE_GOOGLE_ENABLED=true` only after Google is configured in Supabase. Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_AUDIENCE=authenticated`, `FRONTEND_URL`, plus AI provider settings. Never put a service/secret key in a `VITE_` variable.

Add exact Vercel production and controlled preview callback URLs in the Supabase Auth dashboard, along with `/auth/callback` and `/reset-password`. Do not allow unrestricted preview wildcard callbacks. Google remains hidden unless `VITE_SUPABASE_GOOGLE_ENABLED` is true and its provider credentials and redirects are configured.

## Migration and verification

Migrations are ordered under `supabase/migrations`; `supabase/seed.sql` has only fictional catalogue data. All exposed application tables have RLS and explicit authenticated grants. Run `npx supabase start`, `npx supabase db reset`, `npx supabase db advisors`, and the two-account checks in `supabase/tests/rls_isolation.sql` against a non-production project before release.

Supabase’s current Data API change means new public-schema tables may not be exposed automatically. In the hosted project, explicitly expose the required `public` tables in Data API settings before testing; grants and RLS remain separate checks. The migration deliberately does not enable `pgvector`: add it only when a retrieval provider and vector query path are selected.
