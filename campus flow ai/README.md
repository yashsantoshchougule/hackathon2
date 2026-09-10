# CampusFlow Academics

The CampusFlow academic workspace gives authenticated students a single place to manage assignments, timetable entries, verified examinations, attendance simulations, and reminders.

## Run

```powershell
npm.cmd ci
npm.cmd run dev
```

The browser client uses same-origin `/api` by default. Set the public `VITE_ACADEMIC_API_URL` only when FastAPI is hosted elsewhere.

## Authentication handoff

The shared AuthContext must connect its verified Supabase access-token getter once:

```ts
configureAcademicAuth(() => getAccessToken())
```

The academic client does not keep tokens, fabricate a student, or make direct Supabase calls. Without a verified session it shows a 401 state rather than sample academic data.

## Verification

```powershell
npm.cmd run lint
npm.cmd run build
```

The provided environment has no Python interpreter or `.venv`; after the backend environment is restored, run:

```powershell
.\.venv\Scripts\python.exe -m pytest tests\backend\academic -q
```

See [the academic integration contract](docs/academic-integration-contract.md) for FastAPI, Supabase/RLS, notification, dashboard, AI, and schema requirements.
