# CampusFlow interface handoff

Implemented on `feature/ui-dashboard`. No backend, auth, migrations, secret files or other feature pages were changed. No commit, merge or push was performed.

## Run and verify

```powershell
cd 'C:\Hackthon\hackathon2\campus flow ai'
npm.cmd install
npm.cmd run lint
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1
```

PowerShell blocks `npm.ps1` on this machine, so use `npm.cmd`.
Landing: http://127.0.0.1:5173/ · Dashboard: http://127.0.0.1:5173/dashboard

Optional browser checks (Chrome must be installed):

```powershell
npm.cmd install --no-save --package-lock=false @playwright/test
node verify-ui.mjs
```

The browser check covers both pages at 1440, 1024, 768 and 390px, horizontal overflow, runtime/console errors, mobile drawer, sidebar persistence, profile dropdown, recommendation explanation, task filtering, unconnected task updates, navigation search and loading/empty/error/partial states. Screenshots are written to `%TEMP%/campusflow-ui-verification`. Playwright is a temporary verification dependency, not a production dependency.

## Integration contract

Pass `data` into `DashboardPage` to turn off demo mode. Passing an empty object displays empty states; omitting `data` intentionally selects the labelled visual fixture. Demo-only state previews use `/dashboard?state=loading`, `empty`, `error` or `partial`. Query parameters cannot replace supplied production data.

- Authentication team: supply `student` from the existing session and implement the existing `/login` destination. No login is simulated. Register the real login route before the generic fallback.
- Database/academic team: map results to `DashboardInput` in `src/types/dashboard.ts`. Supply `state`, per-section `sectionStates`, and `onRetry`. Supply `onTaskComplete(id, completed)` returning a promise; resolve only after persistence succeeds, and refresh the parent data. The checkbox remains controlled by parent data and shows no false success without a callback.
- AI team: supply a real `nextAction` or `null`, and optionally `onStartTask(id)`. The fixture is explicitly labelled a sample recommendation.
- Feature branches: add the specified assistant, planner, attendance, notices, study-copilot, academics, reminders, notifications and settings routes. Quick actions use query parameters describing intent. The shared fallback is a transparent unavailable screen, not an implementation of those features.
- Attendance values and minimum requirements come from data. Per-subject status compares the supplied percentage to its requirement; the summary does not infer an institution-wide safety threshold.
- Progress and streak appear only when supplied; no fake login, backend writes or live AI results are implemented.

## Changed files

Modified: `package.json`, `package-lock.json` (incremental addition of React Router and Lucide), `src/App.tsx`, `src/index.css`.

Created:

- `src/pages/LandingPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/common/UI.tsx`
- `src/components/common/date.ts`
- `src/components/dashboard/Overview.tsx`
- `src/components/dashboard/ScheduleTimeline.tsx`
- `src/components/dashboard/PriorityTaskList.tsx`
- `src/components/dashboard/AcademicCards.tsx`
- `src/mocks/dashboardDemoData.ts`
- `src/types/dashboard.ts`
- `src/styles/tokens.css`
- `src/styles/campusflow.css`
- `design-reference/README.md`
- `verify-ui.mjs`
- `UI-HANDOFF.md`

The existing unused starter `App.css` and assets were left intact.

## Canva

Canva generated a replacement CampusFlow reference candidate requesting desktop and mobile compositions. See `design-reference/README.md` for the candidate link. The interface is native React/CSS and follows the supplied visual specification; it is not an exported image.

## Commit and push

From the repository root, review and stage only this task's files:

```powershell
cd C:\Hackthon\hackathon2
git branch --show-current
git diff --check
git add -- 'campus flow ai/package.json' 'campus flow ai/package-lock.json' 'campus flow ai/src/App.tsx' 'campus flow ai/src/index.css' 'campus flow ai/src/components' 'campus flow ai/src/pages' 'campus flow ai/src/styles' 'campus flow ai/src/types' 'campus flow ai/src/mocks' 'campus flow ai/design-reference' 'campus flow ai/verify-ui.mjs' 'campus flow ai/UI-HANDOFF.md'
git diff --cached --stat
git commit -m "Build responsive CampusFlow landing page and student dashboard"
git push -u origin feature/ui-dashboard
```
