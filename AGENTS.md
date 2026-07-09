# AGENTS.md

Guidance for Codex and other AI coding agents working in `ncrc-app`.

## Project Snapshot

`ncrc-app` is a real React 19 + TypeScript workflow app for NCRC operations. It uses Vite,
TanStack Router file routes, TanStack Query, Tailwind CSS 4, Radix UI primitives, Sonner,
and AWS Cognito OAuth with a preserved local-dev login path for `http://localhost:3001`.

Main authenticated workflows:

- Application Dashboard: `/ou-workflow/ncrc-dashboard`
- Tasks & Notifications: `/ou-workflow/tasks-dashboard`
- Application Intake Dashboard: `/ou-workflow/prelim-dashboard`
- Profile settings: `/profile`

Useful context files:

- `README.md`: broad architecture and runtime overview.
- `docs/api-contracts.md`: current frontend/mock-server API contract.
- `ARCHITECTURE_ACTION_PLAN.md`: current migration plan and next safe refactor steps.

## Commands

- Install: `npm install`
- Dev server: `npm run dev` or `npm start` (Vite on port 3000)
- Typecheck: `npm run typecheck` or `npx tsc --noEmit`
- Test: `npm run test`
- Lint: `npm run lint`
- Build: `npm run build`
- Format check: `npm run format:check`

After TypeScript, route, API, query, or mapper changes, run `npm run typecheck` at minimum.
Run focused Vitest files when changing tested hooks/components.

## Current Architecture

- `src/main.tsx` is the minimal render entry.
- `src/app/providers/AppProviders.tsx` composes QueryClient, user context, preferences,
  router, and toasts.
- `src/app/router/createAppRouter.ts` creates the TanStack Router and registers route
  context.
- File routes live under `src/routes`.
- Auth/session logic is mostly under `src/features/auth/model`, with legacy Cognito helpers
  still in `src/auth`.
- Shared transport and query infrastructure live under `src/shared/api`.
- Feature APIs, hooks, model/query keys, screens, and components live under
  `src/features/*`.
- Generic UI primitives live under `src/components/ui`.
- Shared feedback UI lives under `src/components/feedback`.
- Remaining transitional workflow surfaces live under `src/components/ou-workflow`.

Do not treat `src/components/ou-workflow` as a target for new feature code. It currently
contains remaining workflow modals, navigation, and a few compatibility hook re-exports.

## Architecture Rules

- Keep route files thin. They may own route declarations, `validateSearch`, loader wiring,
  redirects, error components, and mounting a feature screen.
- Put endpoint wrappers in `src/features/<feature>/api`.
- Put query and mutation hooks in `src/features/<feature>/hooks`.
- Put query keys in `src/features/<feature>/model/queryKeys.ts`.
- Use `src/shared/api` helpers for transport, errors, query defaults, and query params.
- Do not add new imports from `@/api`; `src/api.ts` is a compatibility layer only.
- Prefer feature-owned UI under `src/features/*/components` and route-facing screens under
  `src/features/*/screens`.
- Use `src/hooks` only for truly cross-feature hooks. Feature-specific hooks stay with the
  feature.
- Avoid broad moves from `src/components/ou-workflow` unless the user asks for an
  architecture slice. When you do move a surface, move one coherent area at a time.
- Do not hand-edit `src/routeTree.gen.ts` unless there is no other option. Let TanStack
  Router tooling regenerate it.

## Routing Notes

- Root route: `src/routes/__root.tsx`
- Public auth layout: `src/routes/_public.tsx`
- Authenticated layout: `src/routes/_authed.tsx`
- Large dashboards are lazy-loaded through `index.lazy.tsx` route files.
- Loader-backed routes should use `ensureQueryData` plus a consistent `errorComponent`.
- Normalize search params in route `validateSearch`; feature code should receive normalized
  values.

Important search contracts:

- NCRC Dashboard:
  - `q: string`
  - `status: string`
  - `priority: string`
  - `page: number`
  - `myOnly: boolean`
  - `applicationId?: number`
- Task Dashboard:
  - `qs: string`
  - `days: "pending" | 7 | 30`
  - `page: number`

When linking to dashboards, provide the full required search object or a reducer that
preserves existing values.

## API And Query Conventions

- Use `fetchWithAuth` from `src/shared/api/httpClient.ts`.
- Use `buildPaginationParams(page, limit)` from `src/shared/api/queryParams.ts`.
- Preserve backend `meta` when endpoints return it.
- Use `meta.total_count`, `meta.limit`, and `meta.offset` for pagination.
- Use `keepPreviousData` for paged React Query lists where page changes should not blank the
  UI.
- For infinite queries, compute the next offset from
  `lastPage.meta.offset + lastPage.meta.limit`.
- Prefer feature query keys and targeted invalidation over broad unrelated invalidation.
- Prefer the `get...QueryOptions()` plus `use...()` pattern for new query hooks.

Known paginated endpoints:

- Applications: `/get_applications_v1?page[limit]=...&page[offset]=...`
- Tasks: `/get_application_tasks?page[limit]=...&page[offset]=...`
- Preliminary applications use `/get_applications_v1?application_type=SUBMISSION` with the
  same pagination helper pattern.

Known response quirks:

- `/createApplication?ownsId={id}` returns `{ application_id, status }`.
- `/assignRole` returns `result` as a JSON-encoded string.
- `get_application_tasks` returns `{ data, meta, status }`.
- Some task records use mixed casing such as `TaskCategory`, `TaskInstanceId`,
  `taskCategory`, and `taskInstanceId`; normalize in mappers or feature helpers.
- Some backend fields may be the string `"NULL"`; UI helpers often treat that as empty.
- Consult `docs/api-contracts.md` before changing endpoint wrappers.

## Preferences And Pagination

User display preferences live in `AppPreferencesContext` and profile storage:

- `stageLayout`
- `paginationMode: "paged" | "infinite"`

Application Dashboard and Tasks & Notifications should respect `paginationMode`.

- Paged mode should call the backend with `page[limit]` and `page[offset]`.
- Infinite mode should fetch additional backend pages, not merely reveal a previously fetched
  full list.
- Reset dashboard `page` to `0` when search/filter values change.

## Domain Notes

- `applicationId` is the workflow application id.
- `companyId` is the account/company number in invoice contexts.
- Inspection invoice email and preview account number should use `companyId`, not
  `applicationId`.
- Task action handling is centralized in `src/features/tasks/hooks/useTaskActions.ts`.
- Task dashboard state is in `src/features/tasks/hooks/useTaskDashboardState.ts`.
- Application dashboard state is in `src/features/applications/hooks/useNcrcDashboardState.ts`.
- Prelim dashboard state is in `src/features/prelim/hooks/usePrelimDashboardState.ts`.
- Task notes live under `src/features/tasks/notes`.

## Remaining Architecture Seams

These are known and should guide future cleanup:

- Application Management detail sections now live under
  `src/features/applications/components/application-management`.
- `src/components/ou-workflow/modal/*` is still shared by applications, tasks, and prelim.
- `src/components/ou-workflow/Navigation.tsx` is still mounted by `_authed`.
- `src/components/ou-workflow/hooks/*` still contains compatibility re-exports.
- `src/api.ts` still exists as a compatibility layer, though active source imports should
  avoid it.
- Debug/error logging exists in API/auth/error paths. Remove noisy debug logs, but do not
  hide useful user-facing errors.
- Local-dev login tokens in `src/routes/_public/login.tsx` are intentionally preserved until
  a replacement dev-auth strategy is implemented.

## UI Guidelines

- Use existing Tailwind patterns and local components before adding abstractions.
- Use `lucide-react` icons when an icon is needed.
- Keep operational dashboards dense, predictable, and work-focused.
- Avoid landing-page patterns for internal tools.
- Keep cards for repeated items, modals, and framed tools; do not nest UI cards inside
  cards.
- Preserve accessibility basics: non-submit buttons need `type="button"`, dialogs need
  labels, disabled states should be clear.

## Testing And Verification

- Typecheck after most changes: `npm run typecheck`.
- Run focused Vitest files when changing tested modules.
- Existing test coverage is still light. Add narrow tests when changing shared hooks, query
  behavior, mappers, task actions, notes, or high-risk workflow logic.
- If a change affects frontend behavior, verify the route in the browser when practical.

Current tests include:

- `src/features/applications/hooks/useNcrcDashboardState.test.tsx`
- `src/features/tasks/notes/useTaskNotesDrawerState.test.tsx`
- `src/features/tasks/notes/TaskNotesDrawer.test.tsx`
- `src/test/renderWithProviders.example.test.tsx`

## Working Tree Notes

- This repo may have unrelated local changes and generated files. Do not revert user
  changes.
- On Windows, Git may report dubious ownership. Prefer one-off commands like:
  `git -c safe.directory=C:/Users/Jakit/Documents/shouki/NCRC/ncrc-project/ncrc-app status --short`
- Do not make broad formatting-only changes.
- Avoid editing generated `src/routeTree.gen.ts`; let router tooling regenerate it.
